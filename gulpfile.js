const {src, dest, parallel, watch} = require('gulp');
const rollup = require('gulp-rollup');
const rename = require('gulp-rename');
const uglify = require('gulp-uglify');
const sourcemaps = require('gulp-sourcemaps');

function js() {
    return src('./src/**/*.js')
        .pipe(sourcemaps.init())
        .pipe(rollup({
            input: './src/main.js',
            output: {
                format: 'umd',
                name: 'JStage'
            }
        }))
        // .pipe(uglify())
        .pipe(rename('JStage.min.js'))
        .pipe(sourcemaps.write('./maps'))
        .pipe(dest('./dist'));
}

function watchJs() {
    return watch('./src/**/*.js', parallel(js));
}

exports.js = js;
exports.watchJs = watchJs;
exports.default = parallel(js);
// exports.default = parallel(js, watchJs);

