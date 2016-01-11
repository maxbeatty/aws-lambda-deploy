#!/usr/bin/env node
var prepare = require('./lib/prepare')
var argv = require('yargs')
  .usage('Usage: aws-lambda-deploy [options]')
  .example('$0 -i index.js -t $TRAVIS_COMMIT -b your-build-bucket', 'Prepare a deploy that includes `index.js` identified by the environment variable `TRAVIS_COMMIT` and upload to the AWS S3 bucket `your-build-bucket`')
  .example('$0 -i lib/ -b my-builds -vv', 'Prepare a deploy with maximum verbosity that includes the `lib/` directory and upload to the AWS S3 bucket `my-builds`. The uploaded file will be identified by the current timestamp.')
  .option('include', {
    alias: 'i',
    demand: true,
    type: 'array',
    describe: 'Files and directories to include'
  })
  .option('function-name', {
    alias: 'f',
    demand: true,
    type: 'string',
    describe: 'Name of your AWS Lambda function'
  })
  .option('bucket', {
    alias: 'b',
    demand: true,
    type: 'string',
    describe: 'AWS S3 bucket name to upload source ZIP to'
  })
  .option('tag', {
    alias: 't',
    type: 'string',
    describe: 'Unique identifier for file that is uploaded to S3',
    default: Date.now()
  })
  .option('verbose', {
    alias: 'v',
    type: 'count',
    describe: 'Verbose logging'
  })
  .help('h')
  .alias('h', 'help')
  .argv

prepare(argv, function (err, data) {
  if (err) {
    console.error(err)
    process.exit(1)
  } else {
    console.log('aws-lambda-deploy prepare succeeded')
    console.log(JSON.stringify(data))
    process.exit(0)
  }
})
