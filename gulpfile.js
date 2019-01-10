const {src, dest, parallel, watch} = require('gulp');
const concat = require('gulp-concat');
const uglify = require('gulp-uglify');
const sourcemaps = require('gulp-sourcemaps');

function js() {
    return src(['src/JStage.js', 'src/JStage/*.js', 'src/index.js'])
        .pipe(sourcemaps.init())
        .pipe(concat('JStage.min.js'))
        .pipe(uglify())
        .pipe(sourcemaps.write('./maps'))
        .pipe(dest('./dist'));
}

function watchJs() {
    return watch(['src/JStage.js', 'src/JStage/*.js', 'src/index.js'], parallel(js));
}

exports.js = js;
exports.watchJs = watchJs;
exports.default = parallel(js, watchJs);

