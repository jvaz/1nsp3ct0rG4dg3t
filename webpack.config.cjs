const path = require('path')
const CopyWebpackPlugin = require('copy-webpack-plugin')

module.exports = (env, argv) => {
  const isProduction = argv.mode === 'production'

  return {
    mode: isProduction ? 'production' : 'development',
    devtool: isProduction ? false : 'cheap-module-source-map',
  entry: {
    background: './src/background.js',
    'content-script': './src/content-script.js',
    panel: './src/panel/panel.js'
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
        // Copy panel HTML and CSS
        {
          from: 'src/panel/panel.html',
          to: 'panel.html'
        },
        {
          from: 'src/panel/panel.css',
          to: 'panel.css'
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
      splitChunks: false, // Chrome extensions don't support code splitting
      minimize: isProduction,
      minimizer: isProduction ? [
        '...',
        new (require('terser-webpack-plugin'))({
          terserOptions: {
            compress: {
              drop_console: true, // Remove console.log statements in production
              drop_debugger: true, // Remove debugger statements in production
            },
            mangle: true,
          },
          extractComments: false,
        }),
      ] : [],
    }
  }
}