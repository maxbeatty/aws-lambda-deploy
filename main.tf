/* Terraform module for creating aws-lambda-deploy resources */

variable "region" {
  default = "us-east-1"
}

/* IAM */
# role for ci to build and deploy lambda functions
resource "aws_iam_role" "ci" {
  name = "ci"

  assume_role_policy = <<POLICY
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Action": "sts:AssumeRole",
      "Principal": {
        "Service": "lambda.amazonaws.com"
      },
      "Effect": "Allow",
      "Sid": "Stmt1445981915064"
    }
  ]
}
POLICY
}

# allow ci role to log (mostly for lambda execution)
resource "aws_iam_role_policy" "ci_logs" {
  name = "role_ci_logs"
  role = "${aws_iam_role.ci.id}"

  policy = <<POLICY
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "arn:aws:logs:*:*:*"
    }
  ]
}
POLICY
}

# allow ci role to update all lambda functions in this region
resource "aws_iam_role_policy" "ci_lambda" {
  name = "role_ci_lambda_deploy"
  role = "${aws_iam_role.ci.id}"

  policy = <<POLICY
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "Stmt1451591283432",
      "Effect": "Allow",
      "Action": [
        "lambda:UpdateFunctionCode"
      ],
      "Resource": [
        "arn:aws:lambda:${var.region}::function:*"
      ]
    }
  ]
}
POLICY
}

# user for your CI service (Travis, Jenkins, Circle, etc.) to deploy to AWS
resource "aws_iam_user" "ci" {
  name = "ci"
  path = "/"
}

# you'll want to use this access key in your CI service (most likely as enviroment variables)
resource "aws_iam_access_key" "ci" {
  user = "${aws_iam_user.ci.name}"
}

/* Lambda */

# CI Build
# Triggered by S3 lambda-builds
# Out: uploads ZIP to S3 lambda-releases
# `node setup/build.js` will output build.zip in root of project
variable "lambda_ci_build" {
  default = "./dist/build.zip"
}

resource "aws_lambda_function" "build" {
  filename      = "${var.lambda_ci_build}"
  function_name = "build"
  handler       = "build.handler"
  role          = "${aws_iam_role.ci.arn}"
  description   = "Builds npm dependencies for Lambda platform and uploads bundle to release bucket"
  memory_size   = 1536
  runtime       = "nodejs4.3"
  timeout       = 300
}

resource "aws_lambda_permission" "build" {
  statement_id  = "AllowExecutionFromS3ForCIBuild"
  action        = "lambda:InvokeFunction"
  function_name = "${aws_lambda_function.build.arn}"
  principal     = "s3.amazonaws.com"
  source_arn    = "${aws_s3_bucket.lambda_builds.arn}"
}

# CI Release

# Triggered by S3 lambda-releases

# Out: updates function contained in ZIP

# `node setup/release.js` will output release.zip in root of project
variable "lambda_ci_release" {
  default = "./dist/release.zip"
}

resource "aws_lambda_function" "release" {
  filename      = "${var.lambda_ci_release}"
  function_name = "release"
  handler       = "release.handler"
  role          = "${aws_iam_role.ci.arn}"
  description   = "Updates Lambda function code and creates new release"
  memory_size   = 128
  runtime       = "nodejs4.3"
  timeout       = 30
}

resource "aws_lambda_permission" "release" {
  statement_id  = "AllowExecutionFromS3ForCIRelease"
  action        = "lambda:InvokeFunction"
  function_name = "${aws_lambda_function.release.arn}"
  principal     = "s3.amazonaws.com"
  source_arn    = "${aws_s3_bucket.lambda_releases.arn}"
}

/* Simple Storage Service (S3) */

# bucket to temporarily hold successful builds
# allow ci user to put build zip
# allow ci role to get and then delete objects
resource "aws_s3_bucket" "lambda_builds" {
  bucket = "lambda-builds"
  acl    = "authenticated-read"

  policy = <<POLICY
{
  "Version": "2012-10-17",
  "Id": "Policy1467162062390",
  "Statement": [
    {
      "Action": [
        "s3:GetObject",
        "s3:DeleteObject"
      ],
      "Principal": {
        "AWS": "${aws_iam_role.ci.arn}"
      },
      "Effect": "Allow",
      "Resource": "arn:aws:s3:::lambda-builds/*",
      "Sid": "Stmt1467162062390"
    }, {
      "Action": "s3:PutObject",
      "Principal": {
        "AWS": "${aws_iam_user.ci.arn}"
      },
      "Effect": "Allow",
      "Resource": "arn:aws:s3:::lambda-builds/*",
      "Sid": "Stmt1467162062390"
    }
  ]
}
POLICY
}

resource "aws_s3_bucket_notification" "lambda_builds" {
  bucket = "${aws_s3_bucket.lambda_builds.id}"

  lambda_function {
    lambda_function_arn = "${aws_lambda_function.build.arn}"
    events              = ["s3:ObjectCreated:*"]
  }
}

# bucket to hold releases for lambda functions
# allow ci role to put objects (from build function)
# allow ci role to get objects (for release function)
resource "aws_s3_bucket" "lambda_releases" {
  bucket = "lambda-releases"
  acl    = "authenticated-read"

  policy = <<POLICY
{
  "Version": "2012-10-17",
  "Id": "Policy1467162062390",
  "Statement": [
    {
      "Action": [
        "s3:PutObject",
        "s3:PutObjectAcl",
        "s3:GetObject"
      ],
      "Principal": {
        "AWS": "${aws_iam_role.ci.arn}"
      },
      "Effect": "Allow",
      "Resource": "arn:aws:s3:::lambda-releases/*",
      "Sid": "Stmt1467162062390"
    }
  ]
}
POLICY
}

resource "aws_s3_bucket_notification" "lambda_releases" {
  bucket = "${aws_s3_bucket.lambda_releases.id}"

  lambda_function {
    lambda_function_arn = "${aws_lambda_function.release.arn}"
    events              = ["s3:ObjectCreated:*"]
  }
}
