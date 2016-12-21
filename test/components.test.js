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
  fs = require('fs'),
  mocks = require('./mocks'),
  path = require('path'),
  dir = path.join,
  Promise = require('bluebird');

var TYPE_DIRECTORY = mocks.TYPE_DIRECTORY;
var TYPE_FILE = mocks.TYPE_FILE;
var StatMock = mocks.StatMock;
var ComponentMock = mocks.ComponentMock;
var ComponentInstanceMock = mocks.ComponentInstanceMock;

var MOCK_COMPONENT_CODE = 'module.exports.initialize = function (a, b, c) { c(); }';
var MOCK_COMPONENT_CODE_ARROW_FUNCTION = 'module.exports.initialize = (a, b, c) => { c(); }';

describe('Framing Module', function () {
  describe('components', function () {
    var _tempFsStat, _tempFsReadDir, _tempFsAccessSync, _tempFsReadFileSync, _tempRequire;
    var _readDirPath;
    var _statResponse, _readDirResponse, _requireResponse, _readFileResponse;

    beforeEach(function () {
      _tempFsStat = fs.stat;
      _tempFsReadDir = fs.readdir;
      _tempFsAccessSync = fs.accessSync;
      _tempFsReadFileSync = fs.readFileSync;
      _tempRequire = components.require;

      fs.accessSync = function () {};

      fs.stat = function (path, callback) {
        path = dir(path);
        if (!_statResponse[path]) {
          var error = new Error();
          error.code = 'ENOENT';
          callback(error); return;
        }
        callback(_statResponse[path].error, _statResponse[path].stat);
      };

      fs.readdir = function (path, callback) {
        path = dir(path);
        if (!_readDirResponse[path]) {
          var error = new Error();
          error.code = 'ENOENT';
          callback(error); return;
        }
        _readDirPath = path;
        callback(_readDirResponse[path].error, _readDirResponse[path].files);
      };

      fs.readFileSync = function (path) {
        path = dir(path);
        if (!_readFileResponse[path]) {
          var error = new Error();
          error.code = 'ENOENT';
          throw error;
        }

        return _readFileResponse[path].module;
      };

      components.require = function (path) {
        path = dir(path);
        if (_requireResponse[path].error) {
          throw _requireResponse[path].error;
        }

        return _requireResponse[path].module;
      };
    });

    afterEach(function () {
      fs.stat = _tempFsStat;
      fs.readdir = _tempFsReadDir;
      fs.accessSync = _tempFsAccessSync;
      fs.readFileSync = _tempFsReadFileSync;
      components.require = _tempRequire;
      _readDirPath = _statResponse = _readDirResponse = _requireResponse = null;
    });

    describe('buildComponentList', function () {
      [{ desc: 'null', dir: null },
       { desc: 'undefined', dir: undefined },
       { desc: 'empty', dir: [] }].forEach(function (test) {
         it('When directories is ' + test.desc + ', returns an empty array', function (done) {
           components.buildComponentList(null, test.dir, false, function (error, componentList) {
             expect(error).to.be.null;
             expect(componentList).to.deep.equal([]);
             done();
           });
         });
       });

      describe('When base directory is set', function () {
        beforeEach(function () {
          _readDirResponse = {};
          _readDirResponse[dir('test-base-dir/test-directory')] =
          _readDirResponse[dir('test-directory')] = {
            files: []
          };
        });

        [{ desc: 'null', baseDir: null, expectedDir: 'test-directory' },
         { desc: 'undefined', baseDir: undefined, expectedDir: 'test-directory' },
         { desc: 'test-base-dir', baseDir: 'test-base-dir', expectedDir: dir('test-base-dir/test-directory') }].forEach(function (test) {
           it('to ' + test.desc + ', uses the concatenated path', function (done) {
             components.buildComponentList(test.baseDir, ['test-directory'], false, function () {
               expect(_readDirPath).to.equal(test.expectedDir);
               done();
             });
           });
         });
      });

      describe('When creating a list', function () {
        var _componentList;

        beforeEach(function (done) {
          _readDirResponse = {};
          _readDirResponse[dir('test-directory')] = {
            files: [
              'test.js',
              'test2',
              'test-module',
              'test-component1',
              'test-component2',
              'test-component3'
            ]
          };
          _statResponse = {};
          _statResponse[dir('test-directory/test.js')] = { stat: new StatMock(TYPE_FILE) };
          _statResponse[dir('test-directory/test2')] = { stat: new StatMock() };
          _statResponse[dir('test-directory/test-module')] = { stat: new StatMock(TYPE_DIRECTORY) };
          _statResponse[dir('test-directory/test-component1')] = { stat: new StatMock(TYPE_DIRECTORY) };
          _statResponse[dir('./test-directory/test-component1/package.json')] = { stat: new StatMock(TYPE_FILE) };
          _statResponse[dir('test-directory/test-component2')] = { stat: new StatMock(TYPE_DIRECTORY) };
          _statResponse[dir('./test-directory/test-component2/package.json')] = { stat: new StatMock(TYPE_FILE) };
          _statResponse[dir('test-directory/test-component3')] = { stat: new StatMock(TYPE_DIRECTORY) };
          _statResponse[dir('./test-directory/test-component3/package.json')] = { stat: new StatMock(TYPE_FILE) };
          _requireResponse = {};
          _requireResponse[dir('test-directory/test-component1/package.json')] = {
            module: {
              framing: {
                name: 'test-component1'
              },
              main: 'index.js'
            }
          };
          _requireResponse[dir('test-directory/test-component2/package.json')] = {
            module: {
              name: 'test-component2',
              framing: {
              },
              main: 'index.js'
            }
          };
          _requireResponse[dir('test-directory/test-component3/package.json')] = {
            module: {
              name: 'module-test-component3',
              framing: {
                name: 'test-component3'
              },
              main: 'index.js'
            }
          };
          _readFileResponse = {};
          _readFileResponse[dir('test-directory/test-component1/index.js')] = { module: MOCK_COMPONENT_CODE };
          _readFileResponse[dir('test-directory/test-component2/index.js')] = { module: MOCK_COMPONENT_CODE };
          _readFileResponse[dir('test-directory/test-component3/index.js')] = { module: MOCK_COMPONENT_CODE };

          components.buildComponentList(null, ['test-directory'], false, function (error, componentList) {
            _componentList = componentList;
            done();
          });
        });

        it('does not include modules that are not components', function () {
          expect(_componentList.map(function (component) {
            return component.name;
          })).to.deep.equal([
            'test-component1', 'test-component2', 'test-component3'
          ]);
        });

        it('ignores files', function () {
          expect(_componentList.some(function (component) {
            return component.componentPath === dir('test-directory/test.js');
          })).to.be.false;
        });

        describe('creates the component definition object', function () {
          var _component;

          beforeEach(function () {
            _component = _componentList.filter(function (component) {
              return component.name === 'test-component1';
            })[0];
          });

          it('sets the componentPath', function () {
            expect(dir(_component.componentPath)).to.equal(dir('./test-directory/test-component1'));
          });

          it('sets the componentMainPath', function () {
            expect(dir(_component.componentMainPath)).to.equal(dir('./test-directory/test-component1/index.js'));
          });

          it('sets the name', function () {
            expect(_component.name).to.equal('test-component1');
          });

          it('sets the moduleInfo', function () {
            expect(_component.moduleInfo).to.deep.equal({
              framing: {
                name: 'test-component1'
              },
              main: 'index.js'
            });
          });
        });

        describe('validates the component definition', function () {
          it('fails if name is not set', function (done) {
            _requireResponse[dir('test-directory/test-component1/package.json')] = {
              module: {
                framing: {
                },
                main: 'index.js'
              }
            };
            components.buildComponentList(null, ['test-directory'], false, function (error) {
              expect(error).to.be.ok;
              expect(error.message).to.equal('Invalid component: name parameter is missing from package.json.');
              done();
            });
          });

          it('fails if main is not set', function (done) {
            _requireResponse[dir('test-directory/test-component1/package.json')] = {
              module: {
                framing: {
                  name: 'test-component1'
                }
              }
            };
            components.buildComponentList(null, ['test-directory'], false, function (error) {
              expect(error).to.be.ok;
              expect(error.message).to.equal('Invalid component: main parameter is missing from package.json.');
              done();
            });
          });

          it('does not include component if framing is not in package.json', function (done) {
            _requireResponse[dir('test-directory/test-component1/package.json')] = {
              module: {
              }
            };
            components.buildComponentList(null, ['test-directory'], false, function (error) {
              expect(error).to.be.null;
              done();
            });
          });
        });

        it('returns error if readdir fails', function (done) {
          _readDirResponse = {
            'test-directory': {
              error: new Error('fail')
            }
          };
          components.buildComponentList(null, ['test-directory'], false, function (error) {
            expect(error).to.be.ok;
            expect(error.message).to.equal('fail');
            done();
          });
        });

        it('returns error if stat for directory fails', function (done) {
          _statResponse[dir('test-directory/test-component1')] = {
            error: new Error('fail')
          };
          components.buildComponentList(null, ['test-directory'], false, function (error) {
            expect(error).to.be.ok;
            expect(error.message).to.equal('fail');
            done();
          });
        });

        it('returns error if stat for package json fails', function (done) {
          _statResponse[dir('./test-directory/test-component1/package.json')] = {
            error: new Error('fail')
          };
          components.buildComponentList(null, ['test-directory'], false, function (error) {
            expect(error).to.be.ok;
            expect(error.message).to.equal('fail');
            done();
          });
        });

        it('does not include modules that do not have a main', function (done) {
          _statResponse[dir('./test-directory/test-component1/package.json')] = {
            stat: new StatMock(TYPE_FILE)
          };
          _requireResponse[dir('test-directory/test-component1/package.json')] = {
            module: {
            }
          };
          components.buildComponentList(null, ['test-directory'], false, function (error, componentList) {
            expect(componentList.filter(function (componentInfo) {
              return componentInfo.name === 'test-component1';
            })).to.deep.equal([]);
            done();
          });
        });

        it('loads sub components if available', function (done) {
          _readDirResponse[dir('test-directory/test-component1/sub-directories')] = {
            files: [
              'test-component1-sub-component'
            ]
          };
          _statResponse[dir('test-directory/test-component1/sub-directories')] = {
            stat: new StatMock(TYPE_DIRECTORY)
          };
          _statResponse[dir('test-directory/test-component1/sub-directories/test-component1-sub-component')] = {
            stat: new StatMock(TYPE_DIRECTORY)
          };
          _statResponse[dir('./test-directory/test-component1/sub-directories/test-component1-sub-component/package.json')] = {
            stat: new StatMock(TYPE_FILE)
          };
          _requireResponse[dir('test-directory/test-component1/package.json')] = {
            module: {
              name: 'test-component1',
              main: 'index.js',
              framing: {
                subDirectories: [ 'sub-directories' ]
              }
            }
          };
          _requireResponse[dir('test-directory/test-component1/sub-directories/test-component1-sub-component/package.json')] = {
            module: {
              name: 'test-component1-sub-component',
              main: 'index.js',
              framing: {}
            }
          };
          _readFileResponse[dir('test-directory/test-component1/sub-directories/test-component1-sub-component/index.js')] = {
            module: MOCK_COMPONENT_CODE
          };
          components.buildComponentList(null, ['test-directory'], false, function (error, componentList) {
            expect(componentList.filter(function (componentInfo) {
              return componentInfo.name === 'test-component1-sub-component';
            }).length).to.equal(1);
            done();
          });
        });

        it('empty sub directory does not cause error', function (done) {
          _readDirResponse[dir('test-directory/test-component1/sub-directories')] = {
            files: [ ]
          };
          _statResponse[dir('test-directory/test-component1/sub-directories')] = {
            stat: new StatMock(TYPE_DIRECTORY)
          };
          _requireResponse[dir('test-directory/test-component1/package.json')] = {
            module: {
              main: 'index.js',
              subDirectories: [ 'sub-directories' ]
            }
          };
          components.buildComponentList(null, ['test-directory'], false, function (error) {
            expect(error).to.not.be.ok;
            done();
          });
        });

        it('missing sub directory does not cause error', function (done) {
          _requireResponse[dir('test-directory/test-component1/package.json')] = {
            module: {
              main: 'index.js',
              subDirectories: [ 'sub-directories' ]
            }
          };
          components.buildComponentList(null, ['test-directory'], false, function (error) {
            expect(error).to.not.be.ok;
            done();
          });
        });
      });

      describe('When creating a list from parent node_modules', function () {
        var _componentList;

        beforeEach(function (done) {
          _readDirResponse = {};
          _readDirResponse[dir('../node_modules')] = {
            files: [
              'test.js',
              'test2',
              'test-module',
              'test-component1',
              'test-component2',
              'test-component3'
            ]
          };
          _statResponse = {};
          _statResponse[dir('../node_modules/test.js')] = { stat: new StatMock(TYPE_FILE) };
          _statResponse[dir('../node_modules/test2')] = { stat: new StatMock() };
          _statResponse[dir('../node_modules/test-module')] = { stat: new StatMock(TYPE_DIRECTORY) };
          _statResponse[dir('../node_modules/test-component1')] = { stat: new StatMock(TYPE_DIRECTORY) };
          _statResponse[dir('./../node_modules/test-component1/package.json')] = { stat: new StatMock(TYPE_FILE) };
          _statResponse[dir('../node_modules/test-component2')] = { stat: new StatMock(TYPE_DIRECTORY) };
          _statResponse[dir('./../node_modules/test-component2/package.json')] = { stat: new StatMock(TYPE_FILE) };
          _statResponse[dir('../node_modules/test-component3')] = { stat: new StatMock(TYPE_DIRECTORY) };
          _statResponse[dir('./../node_modules/test-component3/package.json')] = { stat: new StatMock(TYPE_FILE) };
          _requireResponse = {};
          _requireResponse[dir('../node_modules/test-component1/package.json')] = {
            module: {
              name: 'test-component1',
              main: 'index.js',
              framing: {}
            }
          };
          _requireResponse[dir('../node_modules/test-component2/package.json')] = {
            module: {
              name: 'test-component2',
              main: 'index.js',
              framing: {}
            }
          };
          _requireResponse[dir('../node_modules/test-component3/package.json')] = {
            module: {
              name: 'test-component3',
              main: 'index.js',
              framing: {}
            }
          };
          _readFileResponse = {};
          _readFileResponse[dir('../node_modules/test-component1/index.js')] = { module: MOCK_COMPONENT_CODE };
          _readFileResponse[dir('../node_modules/test-component2/index.js')] = { module: MOCK_COMPONENT_CODE };
          _readFileResponse[dir('../node_modules/test-component3/index.js')] = { module: MOCK_COMPONENT_CODE };

          components.buildComponentList('./', null, true, function (error, componentList) {
            _componentList = componentList;
            done();
          });
        });

        describe('creates the component definition object', function () {
          var _component;

          beforeEach(function () {
            _component = _componentList.filter(function (component) {
              return component.name === 'test-component1';
            })[0];
          });

          it('sets the componentPath', function () {
            expect(dir(_component.componentPath)).to.equal(dir('./../node_modules/test-component1'));
          });

          it('sets the componentMainPath', function () {
            expect(dir(_component.componentMainPath)).to.equal(dir('./../node_modules/test-component1/index.js'));
          });

          it('sets the name', function () {
            expect(_component.name).to.equal('test-component1');
          });

          it('sets the moduleInfo', function () {
            expect(_component.moduleInfo).to.deep.equal({
              name: 'test-component1',
              main: 'index.js',
              framing: {}
            });
          });
        });
      });

      describe('When creating a list from parent node_modules and component directory', function () {
        var _componentList;

        beforeEach(function (done) {
          _readDirResponse = {};
          _readDirResponse[dir('../node_modules')] = {
            files: [
              'test.js',
              'test2',
              'test-module',
              'test-component1',
              'test-component2'
            ]
          };
          _readDirResponse[dir('test-directory')] = {
            files: [
              'test-component3'
            ]
          };
          _statResponse = {};
          _statResponse[dir('../node_modules/test.js')] = { stat: new StatMock(TYPE_FILE) };
          _statResponse[dir('../node_modules/test2')] = { stat: new StatMock() };
          _statResponse[dir('../node_modules/test-module')] = { stat: new StatMock(TYPE_DIRECTORY) };
          _statResponse[dir('../node_modules/test-component1')] = { stat: new StatMock(TYPE_DIRECTORY) };
          _statResponse[dir('./../node_modules/test-component1/package.json')] = { stat: new StatMock(TYPE_FILE) };
          _statResponse[dir('../node_modules/test-component2')] = { stat: new StatMock(TYPE_DIRECTORY) };
          _statResponse[dir('./../node_modules/test-component2/package.json')] = { stat: new StatMock(TYPE_FILE) };
          _statResponse[dir('test-directory/test-component3')] = { stat: new StatMock(TYPE_DIRECTORY) };
          _statResponse[dir('./test-directory/test-component3/package.json')] = { stat: new StatMock(TYPE_FILE) };
          _requireResponse = {};
          _requireResponse[dir('../node_modules/test-component1/package.json')] = {
            module: {
              name: 'test-component1',
              main: 'index.js',
              framing: {}     
            }
          };
          _requireResponse[dir('../node_modules/test-component2/package.json')] = {
            module: {
              name: 'test-component2',
              main: 'index.js',
              framing: {}     
            }
          };
          _requireResponse[dir('test-directory/test-component3/package.json')] = {
            module: {
              name: 'test-component3',
              main: 'index.js',
              framing: {}              
            }
          };
          _readFileResponse[dir('../node_modules/test-component1/index.js')] = { module: MOCK_COMPONENT_CODE };
          _readFileResponse[dir('../node_modules/test-component2/index.js')] = { module: MOCK_COMPONENT_CODE };
          _readFileResponse[dir('test-directory/test-component3/index.js')] = { module: MOCK_COMPONENT_CODE_ARROW_FUNCTION };

          components.buildComponentList('./', ['test-directory'], true, function (error, componentList) {
            _componentList = componentList;
            done();
          });
        });

        describe('creates the component 1 definition object', function () {
          var _component;

          beforeEach(function () {
            _component = _componentList.filter(function (component) {
              return component.name === 'test-component1';
            })[0];
          });

          it('sets the componentPath', function () {
            expect(dir(_component.componentPath)).to.equal(dir('./../node_modules/test-component1'));
          });

          it('sets the componentMainPath', function () {
            expect(dir(_component.componentMainPath)).to.equal(dir('./../node_modules/test-component1/index.js'));
          });

          it('sets the name', function () {
            expect(_component.name).to.equal('test-component1');
          });

          it('sets the moduleInfo', function () {
            expect(_component.moduleInfo).to.deep.equal({
              name: 'test-component1',
              main: 'index.js',
              framing: {}
            });
          });
        });

        describe('creates the component 3 definition object', function () {
          var _component;

          beforeEach(function () {
            _component = _componentList.filter(function (component) {
              return component.name === 'test-component3';
            })[0];
          });

          it('sets the componentPath', function () {
            expect(dir(_component.componentPath)).to.equal(dir('./test-directory/test-component3'));
          });

          it('sets the componentMainPath', function () {
            expect(dir(_component.componentMainPath)).to.equal(dir('./test-directory/test-component3/index.js'));
          });

          it('sets the name', function () {
            expect(_component.name).to.equal('test-component3');
          });

          it('sets the moduleInfo', function () {
            expect(_component.moduleInfo).to.deep.equal({
              name: 'test-component3',
              main: 'index.js',
              framing: {}
            });
          });
        });
      });

      describe('When creating a list with the optionalConfig set', function () {
        var _componentList;

        beforeEach(function (done) {
          _readDirResponse = {};
          _readDirResponse[dir('test-directory')] = {
            files: [
              'test.js',
              'test2',
              'test-module',
              'test-component1',
              'test-component2',
              'test-component3'
            ]
          };
          _statResponse = {};
          _statResponse[dir('test-directory/test.js')] = { stat: new StatMock(TYPE_FILE) };
          _statResponse[dir('test-directory/test2')] = { stat: new StatMock() };
          _statResponse[dir('test-directory/test-module')] = { stat: new StatMock(TYPE_DIRECTORY) };
          _statResponse[dir('test-directory/test-component1')] = { stat: new StatMock(TYPE_DIRECTORY) };
          _statResponse[dir('./test-directory/test-component1/package.json')] = { stat: new StatMock(TYPE_FILE) };
          _statResponse[dir('test-directory/test-component2')] = { stat: new StatMock(TYPE_DIRECTORY) };
          _statResponse[dir('./test-directory/test-component2/package.json')] = { stat: new StatMock(TYPE_FILE) };
          _statResponse[dir('test-directory/test-component3')] = { stat: new StatMock(TYPE_DIRECTORY) };
          _statResponse[dir('./test-directory/test-component3/package.json')] = { stat: new StatMock(TYPE_FILE) };
          _requireResponse = {};
          _requireResponse[dir('test-directory/test-component1/package.json')] = {
            module: {
              framing: {
                name: 'test-component1'
              },
              main: 'index.js'
            }
          };
          _requireResponse[dir('test-directory/test-component2/package.json')] = {
            module: {
              name: 'test-component2',
              framing: {
              },
              main: 'index.js'
            }
          };
          _requireResponse[dir('test-directory/test-component3/package.json')] = {
            module: {
              name: 'module-test-component3',
              framing: {
                name: 'test-component3'
              },
              main: 'index.js'
            }
          };
          _readFileResponse = {};
          _readFileResponse[dir('test-directory/test-component1/index.js')] = { module: MOCK_COMPONENT_CODE };
          _readFileResponse[dir('test-directory/test-component2/index.js')] = { module: MOCK_COMPONENT_CODE };
          _readFileResponse[dir('test-directory/test-component3/index.js')] = { module: MOCK_COMPONENT_CODE };

          components.buildComponentList(null, ['test-directory'], false, true, false, function (error, componentList) {
            _componentList = componentList;
            done();
          });
        });

        it('All components are set to optionally include the "config" component', function () {
          expect(_componentList.every(function (component) {
            return component.optionalImports.indexOf('config') === 0;
          })).to.be.true;
        });
      });
    });

    describe('dependencyGraphs', function () {
      describe('sets the imports array with the specified dependencies', function () {
        var _dependencyGraphs;

        before(function (done) {
          var testOptional = new ComponentMock('test-optional');
          var testShared = new ComponentMock('test-shared');
          var testDependency = new ComponentMock('test-dependency', [testShared]);
          var testComponent = new ComponentMock('test-component', [ testShared, testDependency ], [ testOptional ]);
          var componentList = [
            testComponent, testDependency, testShared, testOptional
          ];

          components.dependencyGraphs(componentList, function (error, dependencyGraphs) {
            _dependencyGraphs = dependencyGraphs;
            done();
          });
        });

        it('dependencies are applied to imports array', function () {
          expect(_dependencyGraphs['test-component'].children).to.be.ok;
          expect(_dependencyGraphs['test-component'].children.length).to.equal(3);
          expect(_dependencyGraphs['test-component'].children.some(function (node) {
            return node.componentInfo.name === 'test-shared';
          })).to.be.true;
          expect(_dependencyGraphs['test-component'].children.some(function (node) {
            return node.componentInfo.name === 'test-dependency';
          })).to.be.true;
          expect(_dependencyGraphs['test-component'].children.some(function (node) {
            return node.componentInfo.name === 'test-optional';
          })).to.be.true;
        });

        it('shared dependencies are present in all components', function () {
          expect(_dependencyGraphs['test-component'].children.some(function (node) {
            return node.componentInfo.name === 'test-shared';
          })).to.be.true;

          expect(_dependencyGraphs['test-component'].children
            .filter(function (node) {
              return node.componentInfo.name === 'test-dependency';
            })[0].children
            .some(function (node) {
              return node.componentInfo.name === 'test-shared';
            })).to.be.true;
        });
      });

      it('detects if a dependency is missing', function (done) {
        var testShared = new ComponentMock('test-shared');
        var testComponent = new ComponentMock('test-component', [ testShared ]);
        var componentList = [
          testComponent
        ];

        components.dependencyGraphs(componentList, function (error) {
          expect(error).to.be.ok;
          expect(error.message).to.equal('Missing dependency test-shared for test-component');
          done();
        });
      });

      it('does not fail if an optional dependency is missing', function (done) {
        var testShared = new ComponentMock('test-shared');
        var testComponent = new ComponentMock('test-component', null, [ testShared ]);
        var componentList = [
          testComponent
        ];
        components.dependencyGraphs(componentList, function (error) {
          expect(error).to.be.null;
          done();
        });
      });
    });

    describe('executeComponents', function () {
      it('can execute a graph of only one component', function (done) {
        _requireResponse = {
          'test-component': { module: new ComponentInstanceMock('test-component') }
        };
        components.dependencyGraphs([ new ComponentMock('test-component')], function (error, dependencyGraphs) {
          components.executeComponents(null, [dependencyGraphs['test-component']], function () {
            done(); // success
          });
        });
      });

      it('can execute a graph of one component with no imports array', function (done) {
        _requireResponse = {
          'test-component': { module: new ComponentInstanceMock('test-component') }
        };
        var testComponent = new ComponentMock('test-component');
        testComponent.imports = null;
        components.dependencyGraphs([ testComponent ], function (error, dependencyGraphs) {
          dependencyGraphs['test-component'].imports = null;
          components.executeComponents(null, [dependencyGraphs['test-component']], function () {
            done(); // success
          });
        });
      });

      it('concatenates base directory before execution', function (done) {
        _requireResponse = {};
        _requireResponse[dir('base-directory/test-component')] = { module: new ComponentInstanceMock('test-component') };
        components.dependencyGraphs([ new ComponentMock('test-component')], function (error, dependencyGraphs) {
          components.executeComponents('base-directory', [dependencyGraphs['test-component']], function () {
            done(); // success
          });
        });
      });

      it('executes each component only once', function (done) {
        var testSharedCount = 0, testDependencyCount = 0;
        _requireResponse = {
          'test-component': { module: new ComponentInstanceMock('test-component') },
          'test-component2': { module: new ComponentInstanceMock('test-component2') },
          'test-component3': { module: new ComponentInstanceMock('test-component3') },
          'test-dependency2': { module: new ComponentInstanceMock('test-dependency2') },
          'test-dependency': { module: new ComponentInstanceMock('test-dependency',
            function (imports, ready) {
              ++testDependencyCount;
              ready();
            }) },
          'test-shared': { module: new ComponentInstanceMock('test-shared',
            function (imports, ready) {
              ++testSharedCount;
              ready();
            }) }
        };
        var testShared = new ComponentMock('test-shared');
        var testDependency = new ComponentMock('test-dependency', [testShared]);
        var testDependency2 = new ComponentMock('test-dependency2', [testShared, testDependency]);
        var testComponent = new ComponentMock('test-component', [ testShared, testDependency ]);
        var testComponent2 = new ComponentMock('test-component2', [ testShared ]);
        var testComponent3 = new ComponentMock('test-component3', [ testDependency2 ]);
        components.dependencyGraphs([
          testComponent, testComponent2, testComponent3, testDependency, testDependency2, testShared
        ], function (error, dependencyGraphs) {
          components.executeComponents(null, [
            dependencyGraphs['test-component'], 
            dependencyGraphs['test-component2'], 
            dependencyGraphs['test-component3']
          ], function () {
            expect(testSharedCount).to.equal(1);
            expect(testDependencyCount).to.equal(1);
            done();
          });
        });
      });

      it('emits postInitialize for each component that implements it', function (done) {
        var testDependencyPostInitialized, testSharedPostInitialized;
        _requireResponse = {
          'test-component': { module: new ComponentInstanceMock('test-component') },
          'test-dependency': { module: new ComponentInstanceMock('test-dependency',
            function (imports, ready) {
              ready();
            }, {
              postInitialize: function () {
                testDependencyPostInitialized = true;
              }
            }) },
          'test-shared': { module: new ComponentInstanceMock('test-shared',
            function (imports, ready) {
              ready();
            }, {
              postInitialize: function () {
                testSharedPostInitialized = true;
              }
            }) }
        };
        var testShared = new ComponentMock('test-shared');
        var testDependency = new ComponentMock('test-dependency', [ testShared ]);
        var testComponent = new ComponentMock('test-component', [ testShared, testDependency ]);
        components.dependencyGraphs([
          testShared, testDependency, testComponent
        ], function (error, dependencyGraphs) {
          components.executeComponents(null, [dependencyGraphs['test-component']], function () {
            expect(testDependencyPostInitialized).to.be.true;
            expect(testSharedPostInitialized).to.be.true;
            done();
          });
        });
      });

      it('returns error if exception is thrown', function (done) {
        _requireResponse = {
          'test-component': { module: new ComponentInstanceMock('test-component',
            function () {
              throw new Error('fail');
            }) }
        };
        var testComponent = new ComponentMock('test-component');
        components.dependencyGraphs([
          testComponent
        ], function (error, dependencyGraphs) {
          components.executeComponents(null, [dependencyGraphs['test-component']], function (error) {
            expect(error.initializationErrors[0].message).to.equal('fail');
            done();
          });
        });
      });

      it('returns error if error is returned through ready', function (done) {
        _requireResponse = {
          'test-component': { module: new ComponentInstanceMock('test-component',
            function (imports, ready) {
              ready(new Error('fail'));
            }) }
        };
        var testComponent = new ComponentMock('test-component');
        components.dependencyGraphs([
          testComponent
        ], function (error, dependencyGraphs) {
          components.executeComponents(null, [dependencyGraphs['test-component']], function (error) {
            expect(error.initializationErrors[0].message).to.equal('fail');
            done();
          });
        });
      });

      it('bubbles error if exception is thrown in import component', function (done) {
        _requireResponse = {
          'test-component': { module: new ComponentInstanceMock('test-component') },
          'test-dependency': { module: new ComponentInstanceMock('test-dependency',
            function () {
              throw new Error('fail');
            }) }
        };
        var testDependency = new ComponentMock('test-dependency');
        var testComponent = new ComponentMock('test-component', [ testDependency ]);
        components.dependencyGraphs([
          testComponent, testDependency
        ], function (error, dependencyGraphs) {
          components.executeComponents(null, [dependencyGraphs['test-component']], function (error) {
            expect(error.initializationErrors[0].message).to.equal('fail');
            done();
          });
        });
      });

      it('bubbles error if exception is error is returned through ready in import component', function (done) {
        _requireResponse = {
          'test-component': { module: new ComponentInstanceMock('test-component') },
          'test-dependency': { module: new ComponentInstanceMock('test-dependency',
            function (imports, ready) {
              ready(new Error('fail'));
            }) }
        };
        var testDependency = new ComponentMock('test-dependency');
        var testComponent = new ComponentMock('test-component', [ testDependency ]);
        components.dependencyGraphs([
          testComponent, testDependency
        ], function (error, dependencyGraphs) {
          components.executeComponents(null, [dependencyGraphs['test-component']], function (error) {
            expect(error.initializationErrors[0].message).to.equal('fail');
            done();
          });
        });
      });

      it('executes if initialize returns a promise', function (done) {
        _requireResponse = {
          'test-component': { module: new ComponentInstanceMock('test-component') },
          'test-dependency': { module: new ComponentInstanceMock('test-dependency',
            function () {
              return Promise.resolve();
            }) }
        };
        var testDependency = new ComponentMock('test-dependency');
        var testComponent = new ComponentMock('test-component', [ testDependency ]);
        components.dependencyGraphs([
          testComponent, testDependency
        ], function (error, dependencyGraphs) {
          components.executeComponents(null, [dependencyGraphs['test-component']], function () {
            done();
          });
        });
      });

      it('fails if returned promise from initialize rejects', function (done) {
        _requireResponse = {
          'test-component': { module: new ComponentInstanceMock('test-component') },
          'test-dependency': { module: new ComponentInstanceMock('test-dependency',
            function () {
              return Promise.reject(new Error('fail'));
            }) }
        };
        var testDependency = new ComponentMock('test-dependency');
        var testComponent = new ComponentMock('test-component', [ testDependency ]);
        components.dependencyGraphs([
          testComponent, testDependency
        ], function (error, dependencyGraphs) {
          components.executeComponents(null, [dependencyGraphs['test-component']], function (error) {
            expect(error.initializationErrors[0].message).to.equal('fail');
            done();
          });
        });
      });

      it('fails if initialize that returns promise throws an error', function (done) {
        _requireResponse = {
          'test-component': { module: new ComponentInstanceMock('test-component') },
          'test-dependency': { module: new ComponentInstanceMock('test-dependency',
            function () {
              throw new Error('fail');
            }) }
        };
        var testDependency = new ComponentMock('test-dependency');
        var testComponent = new ComponentMock('test-component', [ testDependency ]);
        components.dependencyGraphs([
          testComponent, testDependency
        ], function (error, dependencyGraphs) {
          components.executeComponents(null, [dependencyGraphs['test-component']], function (error) {
            expect(error.initializationErrors[0].message).to.equal('fail');
            done();
          });
        });
      });

      it('loads the config for components that attempt to use it', function (done) {
        var _config = null;
        _requireResponse = {
          'config': { module: new ComponentInstanceMock('config', function (imports, callback) {
            callback(null, {
              load: function (component) {
                return component.initialize.componentInfo.name === 'test-component'
                  ? { test: 'test' }
                  : null;
              }
            });
          }) },
          'test-component': { module: new ComponentInstanceMock('test-component', function (config, imports, callback) {
            _config = config;
            callback();
          }) },
          'test-dependency': { module: new ComponentInstanceMock('test-dependency') }
        };
        var config = new ComponentMock('config');
        var testDependency = new ComponentMock('test-dependency', null, [ config ]);
        var testComponent = new ComponentMock('test-component', [ testDependency ], [ config ]);
        components.dependencyGraphs([
          testComponent, testDependency, config
        ], function (error, dependencyGraphs) {
          components.executeComponents(null, [dependencyGraphs['test-component']], true, function () {
            expect(_config).to.deep.equal({ test: 'test' });
            done();
          });
        });
      });
    });
  });
});
