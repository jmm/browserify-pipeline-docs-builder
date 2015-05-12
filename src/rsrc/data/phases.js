var
  phases = module.exports = {},
  phase,
  prop;

phases._order = [
  'b.add',
  'b.require',
  'record',
  'deps',
  'deps-expose-all',
  'json',
  'unbom',
  'unshebang',
  'syntax',
  'sort',
  'dedupe',
  'label',
  'emit-deps',
  'debug',
  'pack',
  'wrap',
];

phases._order.forEach(function (id) {
  phase = phases[id] = {
    label: id,
    desc: '',
    props: {},
  };
  ['input', 'output'].forEach(function (dir) {
    phase.props[dir] = {_order: []};
  });
});
