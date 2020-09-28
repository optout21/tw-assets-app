const path = require('path');

module.exports = {
  entry: './src/index.js',
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'static-files'),
    libraryTarget: 'global',
    library: 'script'
  },
  mode: "development"
};
