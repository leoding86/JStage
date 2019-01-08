const {src, dest, parallel, watch} = require('gulp');
const concat = require('gulp-concat');
const uglify = require('gulp-uglify');
const rename = require('gulp-rename');
const sourcemaps = require('gulp-sourcemaps');

function js() {
    return src(['src/JStage.js', 'src/JStage/*.js', 'src/index.js'])
        .pipe(sourcemaps.init())
        .pipe(concat('JStage.min.js'))
        .pipe(uglify())
        .pipe(sourcemaps.write('./maps'))
        .pipe(dest('./dist'));
}

function jsshim() {
    return src(['node_modules/es5-shim/es5-shim.js', 'src/JStage.js', 'src/JStage/*.js', 'src/index.js'])
        .pipe(sourcemaps.init())
        .pipe(rename('JStage.shim.min.js'))
        .pipe(uglify())
        .pipe(sourcemaps.write('./maps'))
        .pipe(dest('./dist'));
}

function watchJs() {
    return watch(['src/JStage.js', 'src/JStage/*.js', 'src/index.js'], parallel(js, jsshim));
}

exports.js = js;
exports.jsshim = jsshim;
exports.watchJs = watchJs;
exports.default = parallel(js, jsshim, watchJs);

