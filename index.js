/* 

Copyright (c) 2016 Accusoft Corp.

Permission is hereby granted, free of charge, to any person obtaining a copy of 
this software and associated documentation files (the "Software"), to deal in 
the Software without restriction, including without limitation the rights to 
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies 
of the Software, and to permit persons to whom the Software is furnished to do 
so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all 
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR 
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, 
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE 
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER 
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, 
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE 
SOFTWARE.

*/

'use strict';

var util = require('util');

var components = require('./components');
var scripting = require('./scripting');

var args = require('yargs').argv;

var EOL = require('os').EOL;

function log(/*args*/) {
  process.stdout.write(util.format.apply(util, arguments) + EOL);
}

function debugLog(/*args*/) {
  if (args.debug) {
    log.apply(this, arguments);
  }
}

function errorLog(/*args*/) {
  log.apply(this, arguments);
}

function loadComponentGraphs(baseDirectory, directories, useNodeModules, optionalConfig, callback) {
  debugLog('base-directory', baseDirectory);
  debugLog('use-node-modules', useNodeModules);
  debugLog('directories', directories);

  components.buildComponentList(baseDirectory, directories, useNodeModules, optionalConfig,
    function (error, componentList) {
      if (error) {
        callback(error); return;
      }

      if (args.debug) {
        debugLog('component-list', componentList.map(function (component) {
          component = JSON.parse(JSON.stringify(component));
          delete component.componentInfo;
          return component;
        }));
      }

      components.dependencyGraphs(componentList, function (error, graphs) {
        if (error) {
          callback(error); return;
        }

        callback(null, graphs);
      });
    });
}

function loadComponents(args, baseDirectory, directories, useNodeModules, entryPoint, optionalConfig, callback) {
  loadComponentGraphs(baseDirectory, directories, useNodeModules, optionalConfig, function (error, graphs) {
    if (error) {
      callback(error); return;
    }

    if (args.debug) {
      debugLog('graph-names', Object.keys(graphs));
    }

    callback(null, Object.keys(graphs)
      .filter(function (name) {
        return (entryPoint
          ? entryPoint === name
          : true);
      })
      .map(function (name) { return graphs[name]; }));
  });
}

function execute(baseDir, componentList, optionalConfig, callback) {
  components.executeComponents(baseDir, componentList, optionalConfig, function (error) {
    callback(error);
  });
}

function scriptify(baseDir, componentList, callback) {
  scripting.scriptify(process.stdout, baseDir, componentList, callback);
}

function Framing() {
  this.baseDir = null;
  this.useNodeModules = true;
  this.componentDirectories = [ './components' ];
}

Framing.prototype.setBaseDir = function (directory) {
  this.baseDir = directory;

  return this;
};

Framing.prototype.setComponentDirectories = function (directories) {
  this.componentDirectories = directories;

  return this;
};

Framing.prototype.useConfig = function () {
  this.optionalConfig = true;

  return this;
};

Framing.prototype.InitializationPath = components.InitializationPath;

Framing.prototype.logComponentErrors = function (error) {
  if (error.initializationErrors && error.initializationErrors.length) {
    errorLog(error.initializationErrors.map(function (error) {
      var componentInfo = error.componentNode.componentInfo;
      return componentInfo.name + '::' + componentInfo.moduleName + EOL + '  ' + (error.message || 'errored') + EOL +  '  ' + (error.stack || '');
    }).join());
    process.exit();
  } else {
    throw error;
  }
};

Framing.prototype.run = function (entryPoint) {
  var _this = this;
  var argDirectories = args.directories !== false && args.directories
    ? args.directories.split(',')
    : [];
  loadComponents(
    args, this.baseDir, this.componentDirectories.concat(argDirectories), this.useNodeModules, entryPoint, this.optionalConfig,
    function (error, componentList) {
      if (error) {
        errorLog(error.stack || error); return;
      }

      if (!args.scriptify) {
        execute(_this.baseDir, componentList, _this.optionalConfig, function (error) {
          if (error) {
            _this.logComponentErrors(error);
          }
        });
      } else {
        scriptify(_this.baseDir, componentList, function (error) {
          if (error) {
            _this.logComponentErrors(error);
          }
        });
      }
    });
};

module.exports = new Framing();
