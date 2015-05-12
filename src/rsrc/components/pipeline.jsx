var
  Phase = require('app/components/phase'),
  Pipeline;

module.exports = Pipeline = React.createClass({
  render: function () {
    var self = this;
    return (
      <table id="pipeline" className="table table-striped">

      <thead>

      <tr>
      <th scope="col" className="phase" rowSpan="2">
      Pipeline phase
      </th>

      <th scope="col" className="desc" rowSpan="2">
      Description
      </th>

      <th scope="col" className="row-props" colSpan="4">
      Relevant <code>row</code> props
      </th>
      </tr>

      <tr>
      <th colSpan="2" scope="col">
      Input
      </th>

      <th colSpan="2" scope="col">
      Output
      </th>
      </tr>
      </thead>

      {self.props.phases._order.map(function (phase) {
        return (
          self.props.phases[phase] ?
          <Phase key={phase} id={phase} data={self.props.phases[phase]} /> :
          null
        );
      })}

      </table>
    );
  },
});
