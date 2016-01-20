var Lab = require('lab')
var Code = require('code')
var proxyquire = require('proxyquire')
var sinon = require('sinon')

var lab = exports.lab = Lab.script()

var expect = Code.expect

var mockS3 = { upload: function () {} }
var mocks = {
  'aws-sdk': {
    S3: function () { return mockS3 }
  }
}

var prepare = proxyquire('../../../lib/prepare', mocks)

lab.experiment('prepare', function () {
  var s

  lab.beforeEach(function (done) {
    s = sinon.sandbox.create()

    s.stub(console, 'log')
    s.stub(mockS3, 'upload').callsArgWith(1, null)

    done()
  })

  lab.afterEach(function (done) {
    s.restore()

    done()
  })

  lab.test('golden path', function (done) {
    prepare({
      include: ['test/fixtures/'],
      functionName: 'prepare-test',
      tag: Date.now()
    }, function (err) {
      expect(err).to.be.null()

      done()
    })
  })

  lab.test('log stderr from exec', function (done) {
    prepare({
      include: ['test/fixtures/'],
      functionName: 'prepare-test',
      tag: Date.now()
    }, function (err) {
      expect(err).to.be.null()

      done()
    })
  })
})
