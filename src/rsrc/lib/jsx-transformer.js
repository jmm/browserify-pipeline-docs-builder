module.exports = jsx_transformer;

function jsx_transformer (el, props, ...children) {
  if (props && props.html !== undefined) {
    props.dangerouslySetInnerHTML = {__html: props.html};
    children = undefined;
    delete props.html;
  }
  return React.createElement(el, props, ...children);
}
