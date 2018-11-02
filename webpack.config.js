const path = require('path')
const process = require('process')

module.exports = {
  entry: './src/index.js',
  output: {
    filename: 'main.js',
    path: path.resolve(__dirname, 'dist')
  },
  mode: process.env.NODE_ENV === 'production' ? 'production' : 'development',
  node: {
    fs: 'empty',
    process: true
  },
  target: 'web'
}
