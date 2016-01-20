/*
  Build script to install dependencies in an AWS Lambda environment,
  bundle with source,
  and upload to AWS S3 which will trigger the next step— release.
*/
var os = require('os')
var path = require('path')
var fs = require('fs')
var stream = require('stream')
var cp = require('child_process')
var AWS = require('aws-sdk')
var archiver = require('archiver')

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
    var e = cp.exec(cmd, opt, function (err) {
      if (err) {
        context.fail(err)
      } else {
        cb()
      }
    })

    e.stdout.on('data', console.log)
  }

  var TMP_DIR = os.tmpDir()
  var npmDir = path.resolve(TMP_DIR, '.npm')
  var npmGlobalDir = path.resolve(TMP_DIR, '.npm-global')
  var tmpDir = path.resolve(TMP_DIR, path.basename(key, '.zip'))
  var buildDir = path.join(tmpDir, 'build')

  exec('mkdir -p ' + [npmDir, npmGlobalDir, tmpDir, buildDir].join(' '), function () {
    var tmpZip = path.join(tmpDir, key)
    var tmpOut = fs.createWriteStream(tmpZip)

    tmpOut.on('error', context.fail)

    tmpOut.on('finish', function () {
      // 2. extract `package.json` to tmp dir
      exec('unzip ' + tmpZip + ' -d ' + buildDir, function () {
        // 3. install dependencies in tmp build dir based on `package.json`
        var npm = path.resolve(__dirname, 'node_modules/npm/bin/npm-cli.js')

        // AWS Lambda doesn't set HOME and v0.10 doesn't support os.homedir()
        process.env.HOME = TMP_DIR
        // AWS Lambda doesn't allow writing to npm's default location
        process.env.NPM_CONFIG_PREFIX = npmGlobalDir
        exec('node ' + npm + ' install --production --cache ' + npmDir, {
          cwd: buildDir,
          env: process.env,
          maxBuffer: 1024 * 1024
        }, function () {
          // 4. create zip of build dir with node_modules that were just installed
          var archive = archiver.create('zip')
          var output = new stream.PassThrough()

          output.on('error', context.fail)

          output.on('finish', function () {
            console.log(archive.pointer() + ' total bytes written')
          })

          archive.on('error', context.fail)

          archive.pipe(output)

          archive.bulk([
            {
              expand: true,
              cwd: buildDir,
              src: ['**/**']
            }
          ])

          // 5. put updated zip file in release bucket
          s3.upload({
            Bucket: bucket.replace(/(builds)?$/, 'releases'),
            Key: key,
            Body: output,
            ACL: 'authenticated-read',
            ContentType: 'application/zip'
          }, context.done)

          archive.finalize()
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
