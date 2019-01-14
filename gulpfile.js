const {src, dest, parallel, watch} = require('gulp');
const { rollup } = require('rollup');
const { uglify } = require('rollup-plugin-uglify');

function js() {
    return rollup({
        input: './src/main.js',
        plugins: [
            uglify()
        ]
    }).then(function(bundle) {
        return bundle.write({
            file: './dist/JStage.min.js',
            format: 'umd',
            name: 'JStage',
            sourcemap: true,
            compact: true
        })
    });
}

function watchJs() {
    return watch('./src/**/*.js', parallel(js));
}

exports.js = js;
exports.watchJs = watchJs;
exports.default = parallel(js, watchJs);

