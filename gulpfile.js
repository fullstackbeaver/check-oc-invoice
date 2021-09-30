const concat    = require("gulp-concat");
const gls       = require("gulp-live-server");
const gulp      = require("gulp");
const minify    = require("gulp-uglify");
const src       = [
  "./src/init.js",
  "./src/extractor.js",
  "./src/extractor_start.js",
  "./src/ui.js",
  "./src/ui_start.js",
  "./src/interpreter.js",
  "./src/interpreter_start.js",
];
const strip     = require("gulp-strip-comments");

function compress() {
  return gulp.src(src)
    .pipe(concat("script-min.js"))
    .pipe(minify())
    .pipe(gulp.dest("./scripts/"));
}

function aggregate() {
  return gulp.src(src)
    .pipe(concat("script.js"))
    .pipe(strip())
    .pipe(gulp.dest("./scripts/"));
}

function watch() {
  // @ts-ignore
  const server = gls.static("./", 8888);
  server.start();
  gulp.watch("./src/*.js", aggregate);
}

module.exports = {
  aggregate,
  compress,
  watch
};