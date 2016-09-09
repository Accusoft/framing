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

var TYPE_DIRECTORY = 0;
module.exports.TYPE_DIRECTORY = TYPE_DIRECTORY;
var TYPE_FILE = 1;
module.exports.TYPE_FILE = TYPE_FILE;

function StatMock(type) {
  var isDirectory = type === TYPE_DIRECTORY;
  var isFile = type === TYPE_FILE;

  this.isDirectory = function () { return isDirectory; };
  this.isFile = function () { return isFile; };
}
module.exports.StatMock = StatMock;

function ComponentMock(name, imports, optionalImports) {
  this.name = name;
  this.moduleName = name;
  this.componentMainPath = name;
  this.imports = (imports || []).map(function (component) { return component.name; });
  this.optionalImports = (optionalImports || []).map(function (component) { return component.name; });
}
module.exports.ComponentMock = ComponentMock;

function ComponentInstanceMock(name, initialize, eventHandlers) {
  this.initialize = initialize || function (imports, ready) {
    ready();
  };

  if (eventHandlers) {
    var _this = this;
    Object.keys(eventHandlers).forEach(function (eventName) {
      _this[eventName] = eventHandlers[eventName];
    });
  }
}
module.exports.ComponentInstanceMock = ComponentInstanceMock;

function StreamMock() {
  var _buffer = '';
  this.write = function (data) {
    _buffer += data;
  };
  this.buffer = function () { return _buffer; };
}
module.exports.StreamMock = StreamMock;
