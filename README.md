# aws-lambda-deploy [![Build Status](https://travis-ci.org/maxbeatty/aws-lambda-deploy.svg)](https://travis-ci.org/maxbeatty/aws-lambda-deploy)

> An automated, opinionated way to deploy to AWS Lambda

**You need a version of `npm` greater than `2.7.0` because this is a scoped package**

```
npm install @maxbeatty/aws-lambda-deploy --save-dev
```

```
./node_modules/.bin/aws-lambda-deploy --function-name your-fn --include index.js lib/ --publish --region us-west-1
```

## What does this do?

1. copies files and directories you want to _include_ along with your `package.json` to a temporary directory
2. installs production dependencies (`npm install --production`)
3. replaces all environment variables (e.g. `process.env.YOUR_VAR`) with value from `process.env`
4. creates a ZIP file containing files and directories you include, `package.json`, and `node_modules`
5. [updates function code and (optionally) publishes a version on AWS](http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/Lambda.html#updateFunctionCode-property)

## Configuration

**You will need to provide AWS credentials via [one of their supported methods](http://docs.aws.amazon.com/AWSJavaScriptSDK/guide/node-configuring.html) (environment variables are easiest when deploying from CI).** The credentials will need to _allow_ updating function code (`lambda:UpdateFunctionCode`) for your function ("Resource").

### Arguments

#### function-name

**Required**

Alias: `f`

Name of your Lambda function

#### include

**Required**

Alias: `i`

List of files and directories to include for your Lambda function (e.g. `-i index.js lib/`)

#### publish

Alias: `p`

Optionally "request AWS Lambda to update the Lambda function and publish a version as an atomic operation."

#### region

Alias: `r`

Optional string to declare which "region to send service requests to." Defaults to "us-east-1"

## Usage

It's useful to call the CLI from [an npm script](https://docs.npmjs.com/misc/scripts) similar to `npm test`.

In your `package.json`, define a "deploy" script.

```json
{
  "scripts": {
    "deploy": "aws-lambda-deploy -f your-fn -i index.js lib/ -p"
  }
}
```

You or your CI service can then run `npm run deploy`
