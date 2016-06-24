module.exports = {
  entry: './src/exploder',
  output: {
    filename: './dist/exploder.js',
    libraryTarget: 'umd',
    library: 'Exploder'
  },
  module: {
    loaders: [
      {test: /\.js$/, loader: 'babel-loader'}
    ]
  }
};
