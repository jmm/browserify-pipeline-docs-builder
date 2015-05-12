module.exports = React.createClass({
  render: function () {
    var
      self = this,
      props = {
        input: self.props.data.props.input,
        output: self.props.data.props.output,
      },
      maxRows = Math.max(props.input._order.length, props.output._order.length),
      rowSpan = maxRows + 1,
      rows = [];

    while (rows.length < maxRows) rows.push(rows.length);

    return (
      <tbody className="phase">
      <tr className="phase">
      <th
        scope="row"
        className="id"
        rowSpan={rowSpan}
      >
      {
      // Non-breaking hyphen
      this.props.data.label.replace('-', '\u2011')
      }
      </th>

      <td className="desc" html={this.props.data.desc} rowSpan={rowSpan}>
      </td>

      <td colSpan="4"></td>
      </tr>

      {rows.map(function (i) {
        return (
          <tr className="props">
          {['input', 'output'].map(function (dir) {
            var prop = props[dir][props[dir]._order[i]] || {};
            return [
              <th className="id" scope="col">
              {prop.id}
              </th>,

              <td className="desc" html={prop.desc}>
              </td>
            ];
          })}
          </tr>
        );
      })}
      </tbody>
    );
  },
});
