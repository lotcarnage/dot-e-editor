const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
	output: {
		path: path.resolve(__dirname, 'built'),
		filename: 'bundle.js'
	},
	mode: 'development',
	devtool: false,
	entry: './built/main.js',
	module: {
		rules: [
			{
				test: /\.html$/,
				loader: "html-loader"
			}
		]
	},
	plugins: [
		new HtmlWebpackPlugin({
			minify: false,
			filename: 'main.html',
			template: './src/main.html',
		})
	]
};
