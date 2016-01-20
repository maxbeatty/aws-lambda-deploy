var Lab = require('lab')
var Code = require('code')
var exec = require('child_process').exec
var path = require('path')
var replace = require('replace')
var sinon = require('sinon')

var lab = exports.lab = Lab.script()

var expect = Code.expect

lab.experiment('Integration', { timeout: 300000 }, function () {
  var execOptions = {
    cwd: path.resolve(__dirname, '..', '..')
  }
  var s

  lab.beforeEach(function (done) {
    s = sinon.sandbox.create()

    s.stub(console, 'log')

    done()
  })

  lab.afterEach(function (done) {
    s.restore()

    done()
  })

  lab.after(function (done) {
    done()
  })

  lab.test('works', function (done) {
    var regex = 'test'
    expect(process.env.NODE_ENV).to.equal(regex)

    exec('./index.js -i test/fixtures/ -b integration-test -f integration-test', execOptions, function (err, stdout, stderr) {
      // console.dir(stdout)
      // console.error(stderr)

      var fixtures = stdout.split('\n')

      replace({
        regex: regex,
        paths: fixtures.filter(function (f) { return f.length > 0 }),
        multiline: true
      })

      // called once for found file and again for replaced instance
      // because we found it, verifies that replacement function worked
      expect(console.log.args).to.have.length(2)

      expect(err).to.be.instanceof(Error)
      expect(err.message).to.include('Missing credentials')

      done()
    })
  })

  lab.test('multiple variables', function (done) {
    expect(process.env).to.include('_', 'LANG')

    exec('./index.js -i test/fixtures/multiple-vars.js  -b integration-test -f integration-test', execOptions, function (err, stdout) {
      // console.dir(stdout)
      // console.error(stderr)
      var fixture = stdout.trim()

      replace({
        regex: process.env.LANG,
        paths: [fixture],
        multiline: true
      })

      // called once for found file and again for replaced instance
      // because we found it, verifies that replacement function worked on multiple variables
      expect(console.log.args).to.have.length(2)

      expect(err).to.be.instanceof(Error)
      expect(err.message).to.include('Missing credentials')

      done()
    })
  })
})
