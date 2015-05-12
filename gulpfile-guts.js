module.exports = function (opts) {
  var
    assert = require('assert'),
    gulp = opts.gulp || require('gulp'),
    browserify = require('browserify'),
    fs = require('fs'),
    path = require('path'),
    del = require('del'),
    mkdirp = require('mkdirp'),
    pathmod = require('pathmodify'),
    watchify = require('watchify'),
    gutil = require('gulp-util'),
    gtemplate = require('gulp-template'),
    _ = require('lodash'),
    through2 = require('through2'),
    cfg = {
      paths: {
        data: path.join(__dirname, 'src', 'rsrc', 'data'),
        build: path.join(__dirname, 'build'),
        dist: path.join(__dirname, 'dist'),
      },
      del: {},
    },
    content = {},
    build;

  _.mixin(require('lodash-deep'));

  Object.keys(opts).forEach(function (prop) {
    _.deepSet(cfg, prop, opts[prop]);
  });

  cfg.bundle = {basedir: cfg.paths.build};

  build = gulp.series(
    assert_cfg,
    load_content,
    clean,
    compile_phase_data,
    gulp.parallel(bundle, copy)
  );

  gulp.task('build', build);

  gulp.task('build:watch', gulp.series(
    function (done) {
      cfg.watch = true;
      done();
    },
    build
  ));

  function clean (done) {
    var pending = pend(done);
    del([
      cfg.paths.dist,
      cfg.paths.build,
    ], cfg.del, function (err, files) {
      if (err) return done(err);
      mkdirp(path.join(cfg.paths.dist, 'rsrc'), pending());
      mkdirp(cfg.paths.build, pending(function (err) {
        if (err) return done(err);
        // Can't use opts.ignore here. See:
        // https://github.com/isaacs/node-glob/issues/194
        gulp.src([
          path.join(__dirname, 'src', '**', '*'),
          // This isn't kosher with node-glob, but I think gulp special-cases it.
          '!' + path.join(cfg.paths.data, 'phases.js'),
        ], {
          base: __dirname,
        })
          .pipe(gulp.dest(cfg.paths.build).on('finish', pending()))
          .on('error', done);
      }));
    });
  }
  // clean

  function bundle () {
    var
      b,
      jsx_prepend = Buffer(
        'var jsx_transformer = require("app/lib/jsx-transformer");\n'
      )
    ;

    b = browserify(_.extend(cfg.bundle, {
        entries: ['./src/rsrc/init'],
        extensions: ['.js', '.json', '.jsx'],
        cache: {},
        packageCache: {},
      }))
      .plugin(pathmod(), {mods: [
        pathmod.mod.dir('app', path.join(cfg.bundle.basedir, 'src', 'rsrc'), true)
      ]})
      .transform(jsx_pragma_xform)
      .transform(require('babelify').configure({
        jsxPragma: 'jsx_transformer'
      }))
    ;

    if (cfg.watch) {
      b = watchify(b)
        .on('update', bundle)
      ;
    }

    return update();

    function update () {
      return b
        .bundle()
        .pipe(fs.createWriteStream(path.join(
          cfg.paths.dist, 'rsrc', 'bundle.js'
        )));
    }
    // update

    function jsx_pragma_xform (file) {
      var stream = through2(/\.jsx$/.test(file) ? write : undefined);

      function write (chunk, enc, done) {
        if (this.first !== false) {
          this.push(jsx_prepend);
          this.first = false;
        }
        this.push(chunk);
        done();
      }

      return stream;
    }
    // jsx_pragma_xform
  }
  // bundle

  function copy (done, opts) {
    opts = opts || {};
    return gulp.src(opts.glob || [
      path.join(__dirname, './src/index.html'),
      path.join(__dirname, './src/rsrc/index.css'),
    ], {base: path.join(__dirname, './src/')})
      .pipe(gtemplate({content: content}))
      .pipe(gulp.dest(cfg.paths.dist))
      .pipe(gutil.buffer(function (err, files) {
        if (cfg.watch && opts.watch !== false) {
          gulp.watch(
            files.map(function (file) { return file.history[0]; }),
            function (event) {
              return copy(null, {glob: event.path, watch: false});
            }
          );
        }
      }));
  }

  function load_content (done) {
    gulp.src(path.join(cfg.paths.content, 'index', '*'), {
      base: path.join(cfg.paths.content),
    })
      .pipe(gutil.buffer(function (err, files) {
        files.forEach(function (file) {
          if (! file.contents) return;
          content[file.relative.replace('\\', '/')] = file.contents.toString();
        });
        done();
      }));
  }

  function update_phases (phases, done) {
    fs.writeFile(path.join(cfg.bundle.basedir, 'src', 'rsrc', 'data', 'phases.json'), JSON.stringify(phases) + '\n', done);
  }

  function update_phase (phases, file) {
    var matches = (file.history[0] || file.path).match(/phase\/([^/]+)\/([^/]+)/);
      phases[matches[1]][matches[2]] = file.contents.toString();
  }

  function update_phase_prop (phases, file) {
    var keys = ['phase', 'prop', 'io', 'content'];

    var matches = file.path.match(/phase\/([^/]+)\/prop\/([^/]+)\/((?:in|out)put)\/([^/]+)/);

    matches.slice(1).forEach(function (val, i) {
      matches[keys[i]] = val;
    });

    var props = phases[matches.phase].props[matches.io];

    if (props._order.indexOf(matches.prop) < 0) {
      props._order.push(matches.prop);
      props[matches.prop] = {id: matches.prop};
    }
    props[matches.prop][matches.content] = file.contents.toString();
  }


  function compile_phases (opts, done) {
    opts = opts || {};

    gulp.src(opts.glob || path.join(cfg.paths.content, 'phase/*/{desc,label}'), {
      base: cfg.paths.content,
    })
      .pipe(gutil.buffer(function (err, files) {
        files.forEach(function (file) {
          if (cfg.watch && opts.watch !== false) {
            gulp.watch(file.path)
              .on('change', per_file);
          }
          per_file();

          function per_file (event) {

            if (event) return compile_phases(_.extend(opts, {
              watch: false,
              glob: event.path,
            }), function () {
              update_phases(opts.phases);
            });
            update_phase(opts.phases, file);
          }
        });

        done && done();
      }));
  }
  // compile_phases

  function compile_phase_props (opts, done) {
    opts = opts || {};

    gulp.src(opts.glob || path.join(
      cfg.paths.content, 'phase/*/prop/*/{input,output}/*'
    ), {base: cfg.paths.content})
      .pipe(gutil.buffer(function (err, files) {
        files.forEach(function (file) {
          if (cfg.watch && opts.watch !== false) {
            gulp.watch(file.path)
              .on('change', per_file);
          }
          per_file();

          function per_file (event) {
            if (event) return compile_phase_props(_.extend(opts, {
              watch: false,
              glob: event.path,
            }), function () {
              update_phases(opts.phases);
            });
            update_phase_prop(opts.phases, file);
          }
        });
        done && done();
      }));
  }
  // compile_phase_props

  function compile_phase_data (done) {
    var
      phases = require(path.join(cfg.paths.data, 'phases')),
      pending = 0,
      opts = {phases: phases};

    function all_done () {
      if (! --pending) {
        update_phases(phases, done);
      }
    }

    [
      compile_phases,
      compile_phase_props,
    ].forEach(function (f) {
      pending++;
      f(opts, all_done);
    });
  }
  // compile_phase_data

  function pend (all_done) {
    function pend (done) {
      var self = pend;
      self.pending++;
      return function pending (err) {
        if (err) return done ? done(err) : all_done(err);

        done && done();

        if (! -- self.pending) {
          all_done();
        }
      };
    }
    pend.pending = 0;
    return pend;
  }

  function assert_cfg (done) {
    assert(cfg.paths.dist, "Must specify 'dist' directory");
    assert(cfg.paths.content, "Must specify 'content' directory");
    done();
  }
};
