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

function loadComponentGraphs(baseDirectory, directories, useNodeModules, optionalConfig, enableDiscovery, callback) {
  debugLog('base-directory', baseDirectory);
  debugLog('use-node-modules', useNodeModules);
  debugLog('directories', directories);

  components.buildComponentList(baseDirectory, directories, useNodeModules, optionalConfig, enableDiscovery,
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

function loadComponents(args, baseDirectory, directories, useNodeModules, entryPoints, optionalConfig, enableDiscovery, callback) {
  loadComponentGraphs(baseDirectory, directories, useNodeModules, optionalConfig, enableDiscovery, function (error, graphs) {
    if (error) {
      callback(error); return;
    }

    if (args.debug) {
      debugLog('graph-names', Object.keys(graphs));
    }

    callback(null, Object.keys(graphs)
      .filter(function (name) {
        return entryPoints.length === 0 || entryPoints.indexOf(name) >= 0;
      })
      .map(function (name) { return graphs[name]; }));
  });
}

function execute(baseDir, componentList, optionalConfig, callback) {
  components.executeComponents(baseDir, componentList, optionalConfig, function (error) {
    callback(error);
  });
}

function scriptify(baseDir, componentList, optionalConfig, callback) {
  scripting.scriptify(process.stdout, baseDir, componentList, optionalConfig, callback);
}

function Framing() {
  this.baseDir = null;
  this.useNodeModules = true;
  this.componentDirectories = [ './components' ];
  this.optionalConfig = false;
  this.enableDiscovery = false;
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

Framing.prototype.useDiscovery = function () {
  this.enableDiscovery = true;

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

Framing.prototype.run = function () {
  var _this = this;
  var argDirectories = args.directories !== false && args.directories
    ? args.directories.split(',')
    : [];  
  var entryPoints = Array.prototype.slice.call(arguments);

  loadComponents(
    args, this.baseDir, this.componentDirectories.concat(argDirectories), this.useNodeModules, entryPoints, this.optionalConfig, this.enableDiscovery,
    function (error, componentList) {
      if (error) {
        errorLog(error.stack || error); return;
      }

      if (componentList.length === 0) {
        errorLog('Unable to find any components.'); return;
      }

      if (!args.scriptify) {
        execute(_this.baseDir, componentList, _this.optionalConfig, function (error) {
          if (error) {
            _this.logComponentErrors(error);
          }
        });
      } else {
        scriptify(_this.baseDir, componentList, _this.optionalConfig, function (error) {
          if (error) {
            _this.logComponentErrors(error);
          }
        });
      }
    });
};

module.exports = new Framing();
