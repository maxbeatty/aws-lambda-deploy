var Lab = require('lab')
var Code = require('code')
var proxyquire = require('proxyquire')
var sinon = require('sinon')

var lab = exports.lab = Lab.script()

var expect = Code.expect

var mockLambda = { updateFunctionCode: function () {} }
var mocks = {
  'aws-sdk': {
    Lambda: function () { return mockLambda }
  }
}

var release = proxyquire('../../../lib/release', mocks)

lab.experiment('release', function () {
  var s
  var event

  lab.beforeEach(function (done) {
    s = sinon.sandbox.create()
    event = {
      Records: [{
        s3: {
          bucket: { name: 'test-releases' },
          object: { key: 'aws-lambda-deploy-release-test-' + Date.now() + '.zip' }
        }
      }]
    }

    s.stub(mockLambda, 'updateFunctionCode').callsArgWith(1, null)

    done()
  })

  lab.afterEach(function (done) {
    s.restore()

    done()
  })

  lab.test('golden path', function (done) {
    release.handler(event, {
      done: function () {
        expect(mockLambda.updateFunctionCode.args[0][0].FunctionName).to.equal('aws-lambda-deploy-release-test')

        done()
      }
    })
  })

  lab.test('bad file', function (done) {
    event.Records[0].s3.object.key = 'funny.gif'

    release.handler(event, {
      fail: function (err) {
        expect(err).to.be.instanceof(Error)

        done()
      }
    })
  })
})
