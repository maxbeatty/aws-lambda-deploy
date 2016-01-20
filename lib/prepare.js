/*
  Prepare script to deploy only the necessary files,
  replace environment variables in those files,
  and upload to AWS S3 which will trigger the next step— build.
*/
var os = require('os')
var path = require('path')
var stream = require('stream')
var fse = require('fs-extra')
var replace = require('replace')
var archiver = require('archiver')
var AWS = require('aws-sdk')
var logging = require('./logging')

module.exports = function (options, callback) {
  var logger = logging(options.verbose)

  logger.DEBUG(options)

  var CWD = process.cwd()
  var newPath = path.resolve(os.tmpdir(), options.functionName, String(options.tag))

  // make temporary new home
  logger.INFO('Creating tmp directory', newPath)
  fse.mkdirsSync(newPath)

  // copy files to temporary home
  options.include.push('package.json')

  var newPlaces = []

  options.include.forEach(function (file) {
    var src = path.resolve(CWD, file)
    var dest = path.resolve(newPath, file)
    logger.INFO('Copying ' + src + ' to ' + dest)

    fse.copySync(src, dest, {
      clobber: true,
      preserveTimestamps: true
    })

    newPlaces.push(dest)
  })

  logger.INFO('Replacing environment variables with values from `process.env`')
  replace({
    regex: /process\.env\.(\w+)/g,
    replacement: function (orig, match) {
      logger.DEBUG('matched environment variable', match)
      return "'" + process.env[match] + "'"
    },
    paths: newPlaces,
    recursive: true
  })

  var zipFile = options.functionName + '-' + options.tag + '.zip'
  logger.INFO('Creating ZIP file named ', zipFile)
  var archive = archiver('zip')
  var output = new stream.PassThrough()

  output.on('finish', function () {
    logger.DEBUG(archive.pointer() + ' total bytes written')
  })

  archive.on('error', callback)

  archive.pipe(output)

  archive.bulk([
    {
      expand: true,
      cwd: newPath,
      src: ['**/**', '!' + zipFile],
      debug: options.verbose >= 2
    }
  ])

  logger.INFO('Uploading ZIP file to AWS S3...')

  var s3 = new AWS.S3({
    apiVersion: '2006-03-01'
  })

  s3.upload({
    Bucket: options.bucket,
    Key: zipFile,
    Body: output,
    ACL: 'authenticated-read',
    ContentType: 'application/zip'
  }, callback)

  archive.finalize()
}
