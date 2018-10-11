const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CleanWebpackPlugin = require('clean-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const ImageminPlugin = require('imagemin-webpack-plugin').default;
const webpack = require('webpack');

module.exports = {
	entry: {
		main: './src/js/main.js',
		restaurant: './src/js/restaurant_info.js',
		sw: './sw.js'
	},
	module: {
		rules: [
			{
				test: /\.css$/,
				use: ['style-loader', 'css-loader']
			}
		]
	},
	plugins: [
		new CleanWebpackPlugin(['dist']),
		new HtmlWebpackPlugin({
			title: 'Restaurant Reviews',
			filename: 'index.html',
			template: './src/index.html',
			chunks: ['main'],
			minify: true
		}),
		new HtmlWebpackPlugin({
			title: 'Restaurant Info',
			filename: 'restaurant.html',
			template: './src/restaurant.html',
			chunks: ['restaurant'],
			minify: true
		}),
		new CopyWebpackPlugin([
			{
				from: './src/img/',
				to: './img/'
			},
			{
				from: './manifest.json',
				to: './manifest.json'
			}
		]),
		new ImageminPlugin({ test: /\.(jpe?g|png|gif|svg)$/i })
	],
	output: {
		filename: chunkData => {
			return chunkData.chunk.name === 'sw' ? '[name].js' : '[name].bundle.js';
		},
		path: path.resolve(__dirname, 'dist')
	}
};
