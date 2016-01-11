var Lab = require('lab')
var Code = require('code')
var proxyquire = require('proxyquire')
var sinon = require('sinon')

var lab = exports.lab = Lab.script()

var expect = Code.expect

var mockS3 = { upload: function () {} }
var mockCp = { exec: function () {} }
var mockFs = { createReadStream: function () {} }
var mocks = {
  'aws-sdk': {
    S3: function () { return mockS3 }
  },
  'child_process': mockCp,
  'fs': mockFs
}

var prepare = proxyquire('../../../lib/prepare', mocks)

lab.experiment('prepare', function () {
  var s

  lab.beforeEach(function (done) {
    s = sinon.sandbox.create()

    s.stub(console, 'log')
    s.stub(mockCp, 'exec')
    s.stub(mockFs, 'createReadStream').returns(new Buffer(''))
    s.stub(mockS3, 'upload').callsArgWith(1, null)

    done()
  })

  lab.afterEach(function (done) {
    s.restore()

    done()
  })

  lab.test('golden path', function (done) {
    mockCp.exec.callsArgWith(2, null, '', '')

    prepare({
      include: ['test/fixtures/'],
      tag: Date.now()
    }, function (err) {
      expect(err).to.be.null()

      done()
    })
  })

  lab.test('log stderr from exec', function (done) {
    mockCp.exec.callsArgWith(2, null, '', 'warning')

    prepare({
      include: ['test/fixtures/'],
      tag: Date.now()
    }, function (err) {
      expect(err).to.be.null()

      done()
    })
  })

  lab.test('handle err from exec', function (done) {
    mockCp.exec.callsArgWith(2, new Error(), '', '')

    prepare({
      include: ['test/fixtures/'],
      tag: Date.now()
    }, function (err) {
      expect(err).to.be.instanceof(Error)

      done()
    })
  })
})
