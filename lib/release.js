/*
  Release script to update Lambda function when S3 bucket updated
  https://aws.amazon.com/blogs/compute/new-deployment-options-for-aws-lambda/
*/
var AWS = require('aws-sdk')
var lambda = new AWS.Lambda()

exports.handler = function (event, context) {
  var bucket = event.Records[0].s3.bucket.name
  var key = event.Records[0].s3.object.key

  var matches = key.match(/^(.+)\-.+\.zip$/)
  if (matches === null) {
    context.fail(new Error('Key (' + key + ') did not match pattern of "function-name-tag.zip"'))
  } else {
    lambda.updateFunctionCode({
      FunctionName: matches[1],
      S3Bucket: bucket,
      S3Key: key,
      Publish: true
    }, context.done)
  }
}
