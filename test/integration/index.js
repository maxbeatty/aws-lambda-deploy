var Lab = require('lab')
var Code = require('code')
var exec = require('child_process').exec
var path = require('path')

var lab = exports.lab = Lab.script()

var expect = Code.expect

lab.experiment('Integration', { timeout: 300000 }, function () {
  lab.test('works', function (done) {
    expect(process.env.NODE_ENV).to.equal('test')

    exec('./index.js -f test-int -i test/fixtures/ -p', {
      cwd: path.resolve(__dirname, '..', '..')
    }, function (err, stdout, stderr) {
      expect(err).to.be.instanceof(Error)
      expect(err.message).to.include('Missing credentials')

      done()
    })
  })
})
