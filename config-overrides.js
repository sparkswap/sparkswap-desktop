module.exports = {
  webpack: function(config, env) {
    config.resolve = Object.assign({}, config.resolve, {
      // we use symlinks to include files from ../shared into
      // the local ./src/global-shared for compilation. By
      // removing symlink resolution we can ensure that
      // Webpack compiles the files instead of ignoring as
      // outside of the project path.
      symlinks: false
    })
    return config
  }
}
