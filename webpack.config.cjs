const path = require('path')
const CopyWebpackPlugin = require('copy-webpack-plugin')

module.exports = {
  mode: 'development',
  devtool: 'cheap-module-source-map',
  entry: {
    background: './src/background.js',
    'content-script': './src/content-script.js',
    popup: './src/popup/popup.js'
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
    clean: true
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env']
          }
        }
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      }
    ]
  },
  plugins: [
    new CopyWebpackPlugin({
      patterns: [
        // Copy manifest.json
        {
          from: 'manifest.json',
          to: 'manifest.json'
        },
        // Copy popup HTML and CSS
        {
          from: 'src/popup/popup.html',
          to: 'popup.html'
        },
        {
          from: 'src/popup/popup.css',
          to: 'popup.css'
        },
        // Copy assets
        {
          from: 'assets',
          to: 'assets',
          noErrorOnMissing: true
        }
      ]
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  },
  optimization: {
    splitChunks: false // Chrome extensions don't support code splitting
  }
}