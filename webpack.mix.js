const mix = require('laravel-mix');
const MomentLocalesPlugin = require('moment-locales-webpack-plugin');
const webpack = require('webpack');

// Patch: empêcher le ProgressPlugin de planter avec des options non supportées
const OriginalProgressPlugin = webpack.ProgressPlugin;
webpack.ProgressPlugin = function(options) {
    if (typeof options === 'function') return new OriginalProgressPlugin(options);
    const safeOptions = {};
    if (options && options.handler) safeOptions.handler = options.handler;
    if (options && options.percentBy) safeOptions.percentBy = options.percentBy;
    return new OriginalProgressPlugin(safeOptions);
};
webpack.ProgressPlugin.prototype = OriginalProgressPlugin.prototype;

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
        new webpack.optimize.LimitChunkCountPlugin({
            maxChunks: 1,
        }),
    ],
});