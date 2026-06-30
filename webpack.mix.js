const mix = require('laravel-mix');
const MomentLocalesPlugin = require('moment-locales-webpack-plugin');

mix.js('resources/src/main.js', 'public')
    .js('resources/src/login.js', 'public')
    .vue({ version: 2 });

mix.webpackConfig({
    output: {
        filename: 'js/[name].min.js',
        chunkFilename: 'js/bundle/[name].js',
    },
    plugins: [
        new MomentLocalesPlugin(),
    ],
});