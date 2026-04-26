const mix = require('laravel-mix');
const MomentLocalesPlugin = require('moment-locales-webpack-plugin');
const webpack = require('webpack');

mix.js('resources/src/main.js', 'public')
    .js('resources/src/login.js', 'public')
    .vue({ version: 2 });

mix.webpackConfig({
    output: {
        filename: 'js/[name].min.js',
        chunkFilename: 'js/bundle/[name].[hash].js',
    },
    plugins: [
        new MomentLocalesPlugin(),
        // Désactiver les dynamic imports pour forcer tout dans un seul bundle
        new webpack.optimize.LimitChunkCountPlugin({
            maxChunks: 1,
        }),
    ],
});