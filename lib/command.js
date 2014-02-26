
'use strict'

var pathLib = require('path')
var optimist = require('optimist')
var error = require('quiver-error').error
var moduleLib = require('quiver-module')
var nodeStream = require('quiver-node-stream')
var componentLib = require('quiver-component')
var streamConvert = require('quiver-stream-convert')
var mergeObjects = require('quiver-merge').mergeObjects
var pipeStream = require('quiver-pipe-stream').pipeStream

var getCommandArgs = function() {
  return optimist.argv
}

var endCommandCallback = function(err) {
  if(err) throw err

  process.exit(0)
}

var loadStreamHandler = function(config, handlerName, callback) {
  var mainHandleableBuilder = config.quiverHandleableBuilders[handlerName]

  if(!mainHandleableBuilder) return callback(error(500,
    'handler component not found: ' + handlerName))

  mainHandleableBuilder(config, function(err, handleable) {
    if(err) return callback(err)

    if(!handleable.toStreamHandler) return callback(error(500,
      'component is not of type stream handler: ' + handlerName))

    var handler = handleable.toStreamHandler()
    callback(null, handler)
  })
}

var pipeNodeStreamThroughHandler = function(handler, args, nodeReadStream, nodeWriteStream, callback) {
  var inputStream = nodeStream.createNodeReadStreamAdapter(nodeReadStream)
  var inputStreamable = streamConvert.streamToStreamable(inputStream)

  handler(args, inputStreamable, function(err, resultStreamable) {
    if(err) return callback(err)

    resultStreamable.toStream(function(err, readStream) {
      if(err) return callback(err)

      var outputStream = nodeStream.createNodeWriteStreamAdapter(nodeWriteStream)
      pipeStream(readStream, outputStream, callback)
    })
  })
}

var runCommandWithConfig = function(config, mainHandlerName, commandArgs, process, callback) {
  loadStreamHandler(config, mainHandlerName, function(err, mainHandler) {
    if(err) return callback(err)

    pipeNodeStreamThroughHandler(mainHandler, commandArgs, process.stdin, process.stdout, callback)
  })
}

var runCommandWithComponents = function(quiverComponents, commandArgs, process, callback) {
  var basePath = process.cwd()
  var commandArgs = getCommandArgs()

  var inputConfig = { }
  var configPath = commandArgs.config

  if(configPath) {
    configPath = pathLib.join(basePath, configPath)
    inputConfig = require(configPath)
  }

  var mainHandlerName = commandArgs.main || inputConfig.main

  componentLib.installComponents(quiverComponents, function(err, componentConfig) {
    if(err) return callback(err)
    
    var config = mergeObjects([inputConfig, componentConfig])
    var mainHandlerName = commandArgs.main || config.main

    if(!mainHandlerName) return callback(error(400,
      'main handler name not specified in command args or config'))

    runCommandWithConfig(config, mainHandlerName, commandArgs, process, callback)
  })
}

var runComponentsAsCommandLine = function(quiverComponents, callback) {
  if(!callback) callback = endCommandCallback

  var commandArgs = getCommandArgs()
  runCommandWithComponents(quiverComponents, commandArgs, process, callback)
}

var runModuleAsCommandLine = function(quiverModule, callback) {
  if(!callback) callback = endCommandCallback

  var quiverComponents = moduleLib.loadComponentsFromQuiverModule(quiverModule)
  runComponentsAsCommandLine(quiverComponents, callback)
}

var runAsCommandLine = function(commandArgs, process, callback) {
  if(!callback) callback = endCommandCallback

  var modulePath = commandArgs._[0]
  var basePath = process.cwd()

  if(!modulePath) throw new Error(
    'module path is not provided as first argument')

  modulePath = pathLib.join(basePath, modulePath)
  var quiverComponents = moduleLib.loadComponentsFromPathSync(modulePath)

  runCommandWithComponents(quiverComponents, commandArgs, process, callback)
}

module.exports = {
  getCommandArgs: getCommandArgs,
  runAsCommandLine: runAsCommandLine,
  runModuleAsCommandLine: runModuleAsCommandLine,
  runComponentsAsCommandLine: runComponentsAsCommandLine,
  runCommandWithComponents: runCommandWithComponents
}