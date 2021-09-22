const gulp = require('gulp');
const minify = require('gulp-minify');

function compress() {
  console.log("compressing");
  
  return gulp.src('./script.js')
    .pipe(minify({ext: {
      min: '.min.js'
  }}))
    // .pipe(gulp.dest('./script-min.js'))
};

module.exports.compress = compress;