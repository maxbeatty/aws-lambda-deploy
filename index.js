#!/usr/bin/env node
var deploy = require('./lib/deploy')
var argv = require('yargs')
  .usage('Usage: aws-lambda-deploy [options]')
  .option('function-name', {
    alias: 'f',
    demand: true,
    type: 'string',
    describe: 'Name of your Lambda function'
  })
  .option('include', {
    alias: 'i',
    demand: true,
    type: 'array',
    describe: 'Files and directories to include'
  })
  .option('region', {
    alias: 'r',
    default: 'us-east-1',
    type: 'string',
    describe: 'AWS region'
  })
  .option('publish', {
    alias: 'p',
    default: true,
    type: 'boolean',
    describe: 'Publish a version'
  })
  .option('verbose', {
    alias: 'v',
    type: 'count',
    describe: 'Verbose logging'
  })
  .help('h')
  .alias('h', 'help')
  .argv

deploy(argv, function (err, data) {
  if (err) {
    console.error(err)
    process.exit(1)
  } else {
    console.log('updateFunctionCode succeeded', data)
    process.exit(0)
  }
})
