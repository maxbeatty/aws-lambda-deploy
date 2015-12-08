exports.handler = function (event, context) {
  console.log('NODE_ENV', process.env.NODE_ENV)
  console.log(JSON.stringify(event))

  context.done()
}
