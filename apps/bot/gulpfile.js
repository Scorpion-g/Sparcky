// gulpfile.js
const { src, dest, series } = require("gulp");
const uglify = require("gulp-uglify");

// Simple task to minify JavaScript files
function minifyJS() {
  return src("src/**/*.js").pipe(uglify()).pipe(dest("dist"));
}

// Default task
exports.default = series(minifyJS);
