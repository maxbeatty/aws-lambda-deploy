var Lab = require('lab')
var Code = require('code')
var proxyquire = require('proxyquire')
var sinon = require('sinon')
var fs = require('fs')
var path = require('path')
var stream = require('stream')

// sue me
stream.Writable.prototype._write = function (chunk, encoding, callback) {
  callback()
}

var lab = exports.lab = Lab.script()

var expect = Code.expect

var mockS3 = {
  getObject: function () {},
  upload: function () {}
}
var mockProc = { stdout: { on: function () {} } }
var mockCp = { exec: function () {} }
var mockFs = {
  createWriteStream: function () {}
}
var mocks = {
  'aws-sdk': {
    S3: function () { return mockS3 }
  },
  'child_process': mockCp,
  'fs': mockFs
}

var build = proxyquire('../../../lib/build', mocks)

lab.experiment('build', function () {
  var s
  var event

  lab.beforeEach(function (done) {
    s = sinon.sandbox.create()
    event = {
      Records: [{
        s3: {
          bucket: { name: 'test-builds' },
          object: { key: 'aws-lambda-deploy-build-test-' + Date.now() + '.zip' }
        }
      }]
    }

    s.stub(console, 'log')
    s.stub(mockS3, 'getObject').returns({
      createReadStream: function () {
        return fs.createReadStream(path.resolve(__dirname, '..', '..', 'fixtures/prepared.zip'))
      }
    })
    s.stub(mockCp, 'exec').returns(mockProc).callsArgWith(2, null)
    s.stub(mockFs, 'createWriteStream').returns(new stream.Writable())
    s.stub(mockS3, 'upload').callsArgWith(1, null)

    done()
  })

  lab.afterEach(function (done) {
    s.restore()

    done()
  })

  lab.test('golden path', function (done) {
    build.handler(event, {
      fail: done,
      done: function (err) {
        expect(err).to.be.null

        expect(mockS3.getObject.callCount).to.equal(1)
        expect(mockCp.exec.callCount).to.equal(3)
        expect(mockS3.upload.callCount).to.equal(1)

        expect(mockS3.upload.args[0][0].Bucket).to.contain('releases')

        done()
      }
    })
  })

  lab.test('exec error', function (done) {
    mockCp.exec.callsArgWith(2, new Error('testing'))

    build.handler(event, {
      fail: function (err) {
        expect(err).to.be.instanceof(Error)

        done()
      }
    })
  })
})
