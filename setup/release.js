var fs = require('fs')
var path = require('path')
var archiver = require('archiver')

var archive = archiver('zip')
var output = fs.createWriteStream(path.resolve(__dirname, '../release.zip'))

output.on('finish', function () {
  console.log(archive.pointer() + ' total bytes written')
})

archive.on('error', function (err) {
  console.error(err)
})

archive.pipe(output)

archive.bulk([
  {
    expand: true,
    cwd: path.resolve(__dirname, '../lib/'),
    src: ['release.js']
  }
])

archive.finalize()
