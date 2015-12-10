exports.handler = function (event, context) {
  console.log('NODE_PATH', process.env._)
  console.log('NODE_LANG', process.env.LANG)
  console.log(JSON.stringify(event))

  context.done()
}
