var Lab = require('lab')
var Code = require('code')
var proxyquire = require('proxyquire')
var sinon = require('sinon')

var lab = exports.lab = Lab.script()

var expect = Code.expect

var mockLambda = { updateFunctionCode: function () {} }
var mockCp = { exec: function () {} }
var mockFs = { readFileSync: function () {} }
var mocks = {
  'aws-sdk': {
    Lambda: function () {
      return mockLambda
    }
  },
  'child_process': mockCp,
  'fs': mockFs
}

var deploy = proxyquire('../../../lib/deploy', mocks)

lab.experiment('deploy', function () {
  var s

  lab.beforeEach(function (done) {
    s = sinon.sandbox.create()

    s.stub(mockCp, 'exec')
    s.stub(mockFs, 'readFileSync').returns(new Buffer(''))
    s.stub(mockLambda, 'updateFunctionCode').callsArgWith(1, null)

    done()
  })

  lab.afterEach(function (done) {
    s.restore()

    done()
  })

  lab.test('golden path', function (done) {
    mockCp.exec.callsArgWith(2, null, '', '')

    deploy({
      functionName: 'test',
      include: ['test/fixtures/'],
      publish: true,
      region: 'us-east-1'
    }, function (err) {
      expect(err).to.be.null()

      done()
    })
  })

  lab.test('log stderr from exec', function (done) {
    mockCp.exec.callsArgWith(2, null, '', 'warning')

    deploy({
      functionName: 'test',
      include: ['test/fixtures/'],
      publish: true,
      region: 'us-east-1',
      verbose: 1
    }, function (err) {
      expect(err).to.be.null()

      done()
    })
  })

  lab.test('handle err from exec', function (done) {
    mockCp.exec.callsArgWith(2, new Error(), '', '')

    deploy({
      functionName: 'test',
      include: ['test/fixtures/'],
      publish: true,
      region: 'us-east-1',
      verbose: 2
    }, function (err) {
      expect(err).to.be.instanceof(Error)

      done()
    })
  })
})
