/*
  Build script to install dependencies in an AWS Lambda environment,
  bundle with source,
  and upload to AWS S3 which will trigger the next step— release.
*/
var os = require('os')
var path = require('path')
var fs = require('fs')
var cp = require('child_process')
var AWS = require('aws-sdk')

var s3 = new AWS.S3({ apiVersion: '2006-03-01' })

exports.handler = function (event, context) {
  console.log('received event:', JSON.stringify(event, null, 2))

  var bucket = event.Records[0].s3.bucket.name
  var key = decodeURIComponent(event.Records[0].s3.object.key.replace(/\+/g, ' '))

  function exec (cmd, opt, cb) {
    if (cb === undefined) {
      cb = opt
      opt = {}
    }
    console.log('executing command', cmd)
    cp.exec(cmd, opt, function (err) {
      if (err) {
        context.fail(err)
      } else {
        cb()
      }
    })
  }

  var tmpDir = path.resolve(os.tmpdir(), path.basename(key, '.zip'))

  exec('mkdir -p ' + tmpDir, function () {
    var tmpZip = path.join(tmpDir, key)
    var tmpOut = fs.createWriteStream(tmpZip)

    tmpOut.on('error', context.fail)

    tmpOut.on('finish', function () {
      // 2. extract `package.json` to tmp dir
      var buildDir = path.join(tmpDir, 'build')
      exec('mkdir -p ' + buildDir, function () {
        exec('unzip -p ' + tmpZip + ' package.json > ' + path.join(buildDir, 'package.json'), function () {
          // 3. install dependencies in tmp build dir based on `package.json`
          exec('npm install --production', { cwd: buildDir }, function () {
            // 4. grow zip with node_modules that were just installed
            exec('zip -rg ' + tmpZip + ' node_modules/', { cwd: buildDir }, function () {
              // 5. put updated zip file in release bucket
              s3.upload({
                Bucket: bucket.replace(/(builds)?$/, 'releases'),
                Key: tmpZip,
                Body: fs.createReadStream(tmpZip),
                ACL: 'authenticated-read',
                ContentType: 'application/zip'
              }, context.done)
            })
          })
        })
      })
    })

    // 1. read s3 file
    var reader = s3.getObject({
      Bucket: bucket,
      Key: key
    }).createReadStream()

    reader.on('error', context.fail)

    reader.pipe(tmpOut)
  })
}
