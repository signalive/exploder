module.exports = {
  entry: './index.js',
  output: {
    filename: './dist/exploder.js',
    sourceMapFilename: './dist/exploder.map',
    library: 'Exploder',
    libraryTarget: 'umd'
  },
  module: {
    loaders: [
      {test: /\.js$/, loader: '6to5-loader'}
    ]
  }
};
