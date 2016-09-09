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

var components = require('./components');

function cleanPath(path) {
  return path.replace(/\\/g, '/');
}

function writeRequires(stream, initializationPath) {
  if (!initializationPath) {
    throw new Error('Parameter initializationPath is required');
  }

  if (!initializationPath.nodes || !initializationPath.nodes.length) {
    throw new Error('Parameter initializationPath.nodes is required');
  }

  initializationPath.nodes.forEach(function (node, i) {
    if (!node.componentInfo.componentMainPath) {
      throw new Error('Component ' + node.componentInfo.name + ' missing main path');
    }

    var componentMainPath = cleanPath(node.componentInfo.componentMainPath);
    stream.write('initializationPath.nodes[' + i + '].componentInstance = require(\'' + componentMainPath + '\'); \n');
  });
}

function writeHeader(stream) {
  stream.write('var framing = require(\'framing\'); \n');
}

function writeComponents(stream, rootComponents) {
  var initializationPath = components.toInitializationPath(rootComponents);
  initializationPath.nodes.forEach(function (node) { delete node.componentInfo.moduleInfo; });
  stream.write('var initializationPath = new framing.InitializationPath(' + JSON.stringify(initializationPath) + '); \n');
  writeRequires(stream, initializationPath);
  stream.write('initializationPath.execute(\'./\', function (error) { if (error) { if (error.initializationErrors) { framing.logComponentErrors(error); } } }); \n');
}

function scriptify(stream, baseDir, rootComponents, callback) {
  try {
    writeHeader(stream);
    writeComponents(stream, rootComponents);
    callback();
  } catch (e) {
    callback(e);
  }
}

module.exports.cleanPath = cleanPath;
module.exports.writeHeader = writeHeader;
module.exports.writeRequires = writeRequires;
module.exports.writeComponents = writeComponents;
module.exports.scriptify = scriptify;
