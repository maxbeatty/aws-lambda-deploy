module.exports = function (VERBOSE_LEVEL) {
  return {
    WARN: function () { VERBOSE_LEVEL >= 0 && console.log.apply(console, arguments) },
    INFO: function () { VERBOSE_LEVEL >= 1 && console.log.apply(console, arguments) },
    DEBUG: function () { VERBOSE_LEVEL >= 2 && console.log.apply(console, arguments) }
  }
}
