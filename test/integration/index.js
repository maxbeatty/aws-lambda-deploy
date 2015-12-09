var Lab = require('lab')
var Code = require('code')
var exec = require('child_process').exec
var path = require('path')
var replace = require('replace')
var sinon = require('sinon')

var lab = exports.lab = Lab.script()

var expect = Code.expect

lab.experiment('Integration', { timeout: 300000 }, function () {
  lab.test('works', function (done) {
    var regex = 'test'
    expect(process.env.NODE_ENV).to.equal(regex)

    exec('./index.js -f test-int -i test/fixtures/ -p', {
      cwd: path.resolve(__dirname, '..', '..')
    }, function (err, stdout, stderr) {
      // console.log(stdout)
      // console.error(stderr)

      var example = stdout.trim()
      sinon.stub(console, 'log')

      replace({
        regex: regex,
        paths: [example],
        multiline: true
      })

      // called once for found file and again for replaced instance
      // because we found it, verify that replacement function worked
      expect(console.log.args).to.have.length(2)

      console.log.restore()

      expect(err).to.be.instanceof(Error)
      expect(err.message).to.include('Missing credentials')

      done()
    })
  })
})
