# aws-lambda-deploy [![Build Status](https://travis-ci.org/maxbeatty/aws-lambda-deploy.svg)](https://travis-ci.org/maxbeatty/aws-lambda-deploy) [![NSP Status](https://nodesecurity.io/orgs/maxbeatty/projects/014047b2-5735-46e7-b948-09dc967581d1/badge)](https://nodesecurity.io/orgs/maxbeatty/projects/014047b2-5735-46e7-b948-09dc967581d1)

> An automated, opinionated way to deploy to AWS Lambda

**You need a version of `npm` greater than `2.7.0` because this is a scoped package**

```
npm install @maxbeatty/aws-lambda-deploy --save-dev
```

```
aws-lambda-deploy --include index.js lib/ --bucket your-build-bucket
```

## What does this do?

This module provides 3 scripts to automatically deploy AWS Lambda functions with dependencies.

1. **Prepare** to deploy only the necessary files, replace environment variables in those files, and upload to AWS S3 which will trigger the next step— build.
2. **Build** dependencies in an AWS Lambda environment, bundle with source, and upload to AWS S3 which will trigger the next step— release.
3. **Release** a new version of your AWS Lambda function.

You'll need to [setup](#setup) 2 S3 buckets and 2 Lambda functions in AWS before beginning the deploy process.

### Prepare

The prepare step is intended to be run from a Continuous Integration (CI) environment. It performs the following actions:

1. replaces all environment variables (e.g. `process.env.YOUR_VAR`) with value from environment
2. creates a ZIP file containing modified files and directories you include along with your `package.json`
3. [uploads the ZIP file to the AWS S3 bucket](http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#upload-property) you configure

The upload will trigger the next step— build. The ZIP file will be named after the specified function name and the specified tag (see arguments below). For example, if your function name is "foo-bar" and your tag is "1.2.3" then the resulting ZIP file would be named "foo-bar-1.2.3.zip". The function name will also be used when releasing.

#### Configuration

**You will need to provide AWS credentials** via [one of their supported methods](http://docs.aws.amazon.com/AWSJavaScriptSDK/guide/node-configuring.html) (environment variables are easiest when deploying from CI). The credentials will need to _allow_ putting objects (`s3:PutObject`) in your AWS S3 bucket ("Resource" like `arn:aws:s3:::my-builds/*`).

##### Arguments

For example usage and descriptions of all possible arguments, you can specify `-h` or `--help` to print and exit.

```
aws-lambda-deploy --help
```

###### include

**Required.** Alias: `i`

List of files and directories to include for your Lambda function (e.g. `-i index.js lib/`)

###### function-name

**Required.** Alias: `f`

Name of your AWS Lambda function

###### bucket

**Required.** Alias: `b`

AWS S3 bucket to upload zip file to (e.g. `-b my-builds`)

###### tag

Optional. Alias: `t`

Optional string to uniquely identify uploaded zip file (e.g. `-t $CIRCLE_SHA1`). Defaults to current timestamp.

###### verbose

Optional. Alias: `v`

Optional count to increase logging verbosity. When omitted, "warn" level logs will be printed. When `-v`, "info" level logs will be printed along with "warn" level logs. When `-vv`, all logs will be printed (i.e. "debug").

#### Usage

You'll most likely want to call the CLI from [an npm script](https://docs.npmjs.com/misc/scripts) like `npm test`. In your `package.json`, define a "deploy" script like this:

```json
{
  "scripts": {
    "deploy": "aws-lambda-deploy -i index.js lib/ -b my-builds -t $GIT_TAG_NAME"
  }
}
```

You or your CI service can then run `npm run deploy`. Be sure your AWS credentials are configured properly.

### Build

The build step is intended to be run as an AWS Lambda function and triggered from an S3 PUT event. It performs the following actions:

1. reads ZIP file from S3
2. extracts `package.json` from ZIP file to temporary directory
3. installs production dependencies with `npm` based on the extracted `package.json`
4. appends `node_modules` directory to ZIP file
5. uploads the modified ZIP file to a "release" AWS s3 bucket

The "release" bucket is determined by convention. If the bucket you configured in the prepare step contains "builds" like "my-builds", then "builds" is replaced by "releases" so the destination bucket is "my-releases". If the bucket you configured in the prepare step does not contain "builds" like "my-ci", then "releases" is appended to that bucket name so the destination bucket is "my-cireleases".

### Release

The release step is intended to be run as an AWS Lambda function and triggered from an S3 PUT event. It [updates function code](http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/Lambda.html#updateFunctionCode-property) based on the name of the S3 object key following the convention from the prepare step. If the prepare step uploaded "foo-bar-1.2.3.zip", then the function "foo-bar" will be updated.

## Setup

As mentioned above, there are a few AWS resources you'll need to set up before using this module. There is an example [Terraform](https://www.terraform.io/) configuration in `main.tf` that you can use as one of [their modules](https://www.terraform.io/docs/modules/usage.html).

```
module "aws-lambda-deploy" {
  source = "github.com/maxbeatty/aws-lambda-deploy"
}
```

_Contributions welcomed for more automation in setting these up_

### IAM

You'll need an IAM role that can assume the Lambda role. That role will need policies to create log groups, create log streams, and put log events. It will also need a role policy to update Lambda function code for all of your functions in the account.

You'll also probably want a dedicated user for your Continuous Integration job.

### Lambda

You'll need one Lambda function for `lib/build.js` and another for `lib/release.js`. You may want to max out memory and timeout for the `build` function.

#### Build

To create a ZIP file of `lib/build.js` and its dependencies ready to upload to Lambda, run `node setup/build.js` which will create `build.zip` in the root of this project.

#### Release

To create a ZIP file of `lib/release.js` ready to upload to Lambda, run `node setup/release.js` which will create `release.zip` in the root of this project.

### S3

You'll need one S3 bucket preferably with a name ending with "builds". The IAM role you previously created will need to be able to get objects from this bucket. Your CI user will need permission to put objects into this bucket. The "build" Lambda function will need to have a permission added so this "build" bucket can invoke it. Then, this S3 bucket will need a notification configuration to trigger the "build" Lambda function when an object is created.

You'll also need an S3 bucket with a name ending with "releases". The IAM role you previously created will need to be able to get and put objects from and to this bucket. It will also need permission to "PutObjectAcl". The "release" Lambda function will need to have a permission added so this "release" bucket can invoke it. Then, this S3 bucket will need a notification configuration to trigger the "release" Lambda function when an object is created.

## Thanks

This wouldn't be possible without [tomdale/lambda-packager](https://github.com/tomdale/lambda-packager) and [node-hocus-pocus/thaumaturgy](https://github.com/node-hocus-pocus/thaumaturgy)
