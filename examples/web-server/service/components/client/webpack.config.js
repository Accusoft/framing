module.exports = {
  entry: './js/entry.js',
  output: {
    path: __dirname + '/dist',
    filename: 'bundle.js'
  },
  resolve: {
    modulesDirectories: [ './js', './node_modules', __dirname + '../']
  },
  module: {
    loaders: [
        { test: /\.css$/, loader: 'style!css' }
    ]
  }
};