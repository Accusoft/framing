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

var expect = require('chai').expect,
  components = require('../components'),
  scripting = require('../scripting.js'),
  fs = require('fs'),
  mocks = require('./mocks');

var TYPE_DIRECTORY = mocks.TYPE_DIRECTORY;
var TYPE_FILE = mocks.TYPE_FILE;
var StatMock = mocks.StatMock;
var ComponentMock = mocks.ComponentMock;
var ComponentInstanceMock = mocks.ComponentInstanceMock;
var StreamMock = mocks.StreamMock;

describe('Framing Module', function () {
  var _tempFsStat, _tempFsReadDir, _tempRequire;
  var _statPath, _readDirPath, _requirePath;
  var _statResponse, _readDirResponse, _requireResponse;

  beforeEach(function () {
    _tempFsStat = fs.stat;
    _tempFsReadDir = fs.readdir;
    _tempRequire = components.require;

    fs.stat = function (path, callback) {
      if (!_statResponse[path]) {
        var error = new Error();
        error.code = 'ENOENT';
        callback(error); return;
      }
      callback(_statResponse[path].error, _statResponse[path].stat);
    };

    fs.readdir = function (path, callback) {
      if (!_readDirResponse[path]) {
        var error = new Error();
        error.code = 'ENOENT';
        callback(error); return;
      }
      _readDirPath = path;
      callback(_readDirResponse[path].error, _readDirResponse[path].files);
    };

    components.require = function (path) {
      if (_requireResponse[path].error) {
        throw _requireResponse[path].error;
      }

      return _requireResponse[path].module;
    };
  });

  afterEach(function () {
    fs.stat = _tempFsStat;
    fs.readdir = _tempFsReadDir;
    components.require = _tempRequire;
    _statPath = _readDirPath = _statResponse = _readDirResponse = _requirePath = _requireResponse = null;
  });

  describe('scripting', function () {
    describe('cleanPath', function () {
      it('replaces \'\\\' with \'/\'', function () {
        expect(scripting.cleanPath('./test\\test')).to.equal('./test/test');
      });
    });

    describe('scriptify', function () {
      var _componentList, _streamMock, _initializationPath;
      beforeEach(function (done) {
        _requireResponse = {
          'test-component': { module: new ComponentInstanceMock('test-component') },
          'test-dependency': { module: new ComponentInstanceMock('test-dependency',
            function (params, imports, ready) {
              ready();
            }) },
          'test-shared': { module: new ComponentInstanceMock('test-shared',
            function (params, imports, ready) {
              ready();
            }) }
        };
        var testShared = new ComponentMock('test-shared');
        var testDependency = new ComponentMock('test-dependency', [testShared]);
        var testComponent = new ComponentMock('test-component', [ testShared, testDependency ]);
        _streamMock = new StreamMock();
        components.dependencyGraphs([
          testComponent, testDependency, testShared
        ], function (error, dependencyGraphs) {
          _initializationPath = components.toInitializationPath([dependencyGraphs['test-component']]);
          done();
        });
      });

      describe('writeHeader', function () {
        it('requires framing', function () {
          scripting.writeHeader(_streamMock);
          expect(_streamMock.buffer()).to.equal('var framing = require(\'framing\'); \n');
        });
      });

      describe('writeRequires', function () {
        it('writes require statements for components', function () {
          scripting.writeRequires(_streamMock, _initializationPath);
          var actual = '' +
          'initializationPath.nodes[0].componentInstance = require(\'test-shared\'); \n' +
          'initializationPath.nodes[1].componentInstance = require(\'test-dependency\'); \n' +
          'initializationPath.nodes[2].componentInstance = require(\'test-component\'); \n';
          expect(_streamMock.buffer()).to.equal(actual);
        });

        it('throws if initializationPath is null', function () {
          expect(function () { scripting.writeRequires(_streamMock, null); }).to.throw('Parameter initializationPath is required');
        });

        it('throws if no components', function () {
          expect(function () { scripting.writeRequires(_streamMock, {}); }).to.throw('Parameter initializationPath.nodes is required');
        });

        it('throws if a component is missing the main path', function () {
          expect(function () { scripting.writeRequires(_streamMock, { nodes: [ { componentInfo: { name: 'test' } } ] }); }).to.throw('Component test missing main path');
        });
      });

      describe('writeComponents', function () {
        var _streamMock;

        before(function () {
          _streamMock = new StreamMock();
          scripting.writeComponents(_streamMock, [ new components.DependencyGraphNode({ 
            componentMainPath: 'test' 
          }) ]);
        });

        it('constructions initializationPath', function () {
          expect(_streamMock.buffer()).to.equal(
            'var initializationPath = new framing.InitializationPath({"nodes":[{"level":0,"dependencyCount":0,"dependencies":[],"componentInfo":{"componentMainPath":"test"}}]}); \n' + 
            'initializationPath.nodes[0].componentInstance = require(\'test\'); \n' + 
            'initializationPath.execute(\'./\', function (error) { if (error) { if (error.initializationErrors) { framing.logComponentErrors(error); } } }); \n'
          );
        });
      });
    });
  });
});
