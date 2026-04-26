const mix = require('laravel-mix');
const MomentLocalesPlugin = require('moment-locales-webpack-plugin');
const { ProgressPlugin } = require('webpack');

// Patch: override ProgressPlugin pour éviter l'erreur de schéma
const originalProgressPlugin = ProgressPlugin;
require('webpack').ProgressPlugin = function (options) {
    const safeOptions = {};
    if (typeof options === 'function') return new originalProgressPlugin(options);
    if (options && options.handler) safeOptions.handler = options.handler;
    return new originalProgressPlugin(safeOptions);
};

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
    ]
});