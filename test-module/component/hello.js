
'use strict'

var helloHandlerBuilder = function(config, callback) {
  var greet = config.greet || 'hello'

  var handler = function(args, name, callback) {
    var greeting = greet + ', ' +  name

    if(args.repeat) greeting = greeting + greeting
    callback(null, greeting)
  }

  callback(null, handler)
}

var quiverComponents = [
  {
    name: 'test hello handler',
    type: 'simple handler',
    inputType: 'text',
    outputType: 'text',
    handlerBuilder: helloHandlerBuilder
  }
]

module.exports = {
  quiverComponents: quiverComponents
}