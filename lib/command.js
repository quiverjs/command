
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

var moduleCtx = moduleLib.enterContext(require)

var loadComponentAndConfig = function(quiverModule, configPath, callback) {
  moduleLib.loadComponentsFromQuiverModule(quiverModule, function(err, quiverComponents) {
    if(err) return callback(err)

    componentLib.installComponents(quiverComponents, function(err, componentConfig) {
      if(err) return callback(err)

      if(!configPath) return callback(null, componentConfig)

      moduleCtx.requireAsync(configPath, function(err, config) {
        if(err) return callback(err)

        var mergedConfig = mergeObjects([config, componentConfig])
        callback(null, mergedConfig)
      })
    })
  })
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

var runModule = function(quiverModule, commandArgs, process, callback) {
  var basePath = process.cwd()
  var configPath = commandArgs.config
  if(configPath) configPath = pathLib.join(basePath, configPath)

  loadComponentAndConfig(quiverModule, configPath, function(err, config) {
    if(err) return callback(err)

    var mainHandlerName = commandArgs.main || config.main

    if(!mainHandlerName) return callback(error(500, 
      'No main quiver component specified'))

    loadStreamHandler(config, mainHandlerName, function(err, mainHandler) {
      if(err) return callback(err)

      pipeNodeStreamThroughHandler(mainHandler, commandArgs, process.stdin, process.stdout, callback)
    })
  })
}

var runModuleAsCommand = function(quiverModule) {
  var commandArgs = optimist.argv
  runModule(quiverModule, optimist.argv, process, function(err) {
    if(err) throw err

    process.exit(0)
  })
}

var runCommand = function(commandArgs, process, callback) {
  var modulePath = commandArgs._[0]
  var basePath = process.cwd()

  if(!modulePath) return callback(error(400, 
    'module path is not specified as first argument'))

  modulePath = pathLib.join(basePath, modulePath)

  moduleCtx.requireAsync(modulePath, function(err, module) {
    if(err) return callback(err)

    var quiverModule = module.quiverModule
    if(!quiverModule) return callback(error(500, 
      'module ' + modulePath + ' is not a quiver module!'))

    runModule(quiverModule, commandArgs, process, callback)
  })
}

module.exports = {
  runCommand: runCommand,
  runModuleAsCommand: runModuleAsCommand
}