const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const webpack = require('webpack');

const appDirectory = path.resolve(__dirname);
const { presets } = require('./babel.config');

module.exports = {
  mode: 'development',
  entry: path.resolve(appDirectory, 'index.web.js'), // 웹 진입점
  output: {
    path: path.resolve(appDirectory, 'web-build'),
    filename: 'bundle.web.js',
  },
  resolve: {
    extensions: ['.web.js', '.js', '.web.ts', '.ts', '.web.tsx', '.tsx'],
    alias: {
      'react-native$': 'react-native-web',
    },
  },
  module: {
    rules: [
      {
        test: /\.(ts|js)x?$/,
        exclude: /node_modules\/(?!((@react-native(-community)?|expo(-status-bar)?)\/.*|react-native-web|react-navigation|@react-navigation\/.*|styled-components))\//,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['babel-preset-expo'], // Expo preset 사용 (React Native Web 호환)
            plugins: ['react-native-web'],
          },
        },
      },
      {
        test: /\.(png|jpe?g|gif|svg)$/i,
        use: [
          {
            loader: 'file-loader',
            options: {
              name: '[name].[ext]',
              outputPath: 'assets/images',
            },
          },
        ],
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: path.resolve(appDirectory, 'public/index.html'),
    }),
    new webpack.DefinePlugin({
      __DEV__: JSON.stringify(true),
    }),
  ],
  devServer: {
    port: 8080,
    historyApiFallback: true,
    open: true,
  },
};
