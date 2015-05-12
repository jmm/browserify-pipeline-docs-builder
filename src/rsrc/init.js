document.addEventListener('DOMContentLoaded', function () {
  React.render(
    React.createElement(
      require('app/components/pipeline'),
      {phases: require('app/data/phases')}
    ),
    document.getElementById('pipeline-phases')
  );
});
