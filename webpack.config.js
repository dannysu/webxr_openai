const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
    mode: 'development',
    entry: './src/index.js',
    devServer: {
        static: {
            directory: path.join(__dirname, 'docs'),
        },
        compress: true,
        port: 8081,
    },
    output: {
        filename: 'bundle.js',
        path: path.resolve(__dirname, 'docs'),
    },
    plugins: [
        new HtmlWebpackPlugin({
            template: './src/index.html',
        }),
    ],
};
