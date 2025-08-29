const path = require('path');

module.exports = {
  entry: {
    background: './src/background.ts',
    content: './src/content.ts',
    popup: './src/popup.ts'
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: ['.ts', '.js'],
  },
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, 'dist'),
    clean: true,
    iife: false, // Prevent IIFE wrapper for cleaner output
  },
  target: 'web',
  optimization: {
    minimize: false, // Never minify for readability
    concatenateModules: true, // Concatenate modules for simpler output
    splitChunks: false, // Don't split chunks - keep everything in single files
    usedExports: false, // Don't tree shake for readability
    sideEffects: false, // Allow all side effects
  },
  mode: 'development', // Always use development mode for readable output
  devtool: false, // No source maps
};