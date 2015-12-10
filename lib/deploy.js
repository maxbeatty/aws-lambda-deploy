var os = require('os')
var path = require('path')
var fs = require('fs')
var fse = require('fs-extra')
var cp = require('child_process')
var replace = require('replace')
var AWS = require('aws-sdk')

module.exports = function (options, callback) {
  var VERBOSE_LEVEL = options.verbose

  // function WARN () { VERBOSE_LEVEL >= 0 && console.log.apply(console, arguments) }
  function INFO () { VERBOSE_LEVEL >= 1 && console.log.apply(console, arguments) }
  function DEBUG () { VERBOSE_LEVEL >= 2 && console.log.apply(console, arguments) }

  DEBUG(options)

  var newPath = path.resolve(os.tmpdir(), options.functionName)

  // make temporary new home
  INFO('Creating tmp directory', newPath)
  fse.mkdirsSync(newPath)

  // copy files to temporary home
  options.include.push('package.json')

  var newPlaces = []

  options.include.forEach(function (file) {
    var src = path.resolve(process.cwd(), file)
    var dest = path.resolve(newPath, file)
    INFO('Copying ' + src + ' to ' + dest)

    fse.copySync(src, dest, {
      clobber: true,
      preserveTimestamps: true
    })

    newPlaces.push(dest)
  })

  function exec (cmd, cb) {
    cp.exec(cmd, {
      cwd: newPath
    }, function (err, stdout, stderr) {
      DEBUG(stdout)

      if (stderr.length) {
        DEBUG('stderr:')
        INFO(stderr)
      }

      if (err) {
        callback(err)
      } else {
        cb()
      }
    })
  }

  // install production dependencies
  INFO('Installing production dependencies...')
  exec('npm install --production', function () {
    INFO('Replacing environment variables with values from `process.env`')
    replace({
      regex: /process\.env\.(\w+)/g,
      replacement: function (orig, match) {
        DEBUG('matched environment variable', match)
        return "'" + process.env[match] + "'"
      },
      paths: newPlaces,
      recursive: true
    })

    var zipFile = options.functionName + '.zip'
    INFO('Creating ZIP file named ', zipFile)
    exec('zip -qr ' + zipFile + ' *', function () {
      INFO('Updating function code on AWS...')

      new AWS.Lambda({
        apiVersion: '2015-03-31',
        region: options.region
      }).updateFunctionCode({
        FunctionName: options.functionName,
        ZipFile: fs.readFileSync(path.join(newPath, zipFile)),
        Publish: options.publish
      }, callback)
    })
  })
}
