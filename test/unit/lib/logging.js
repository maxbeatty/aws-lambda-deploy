var Lab = require('lab')
var Code = require('code')
var sinon = require('sinon')

var lab = exports.lab = Lab.script()

var expect = Code.expect

var logging = require('../../../lib/logging')

lab.experiment('logging', function () {
  lab.test('returns object of log level functions', function (done) {
    var logger = logging(0)
    expect(logger).to.be.an.object()
    expect(logger).to.include('WARN', 'INFO', 'DEBUG')

    done()
  })

  lab.test('verbosity levels', function (done) {
    var tests = [
      { level: -1, WARN: false, INFO: false, DEBUG: false },
      { level: 0, WARN: true, INFO: false, DEBUG: false },
      { level: 1, WARN: true, INFO: true, DEBUG: false },
      { level: 2, WARN: true, INFO: true, DEBUG: true }
    ]

    var levels = ['WARN', 'INFO', 'DEBUG']

    tests.forEach(function (t) {
      var logger = logging(t.level)

      levels.forEach(function (level) {
        sinon.stub(console, 'log')
        logger[level]('testing')
        expect(console.log.calledOnce).to.equal(t[level])
        console.log.restore()
      })
    })

    done()
  })
})
