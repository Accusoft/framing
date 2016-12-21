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

var fs = require('fs'),
  path = require('path');

module.exports.require = require;

function loadModuleInfo(componentInfoPath) {
  var componentInfo = module.exports.require(componentInfoPath);

  return componentInfo;
}

function loadComponent(componentMainPath) {
  var componentInstance = module.exports.require(componentMainPath);

  return componentInstance;
}

function ComponentInfo(componentPath, moduleInfo, optionalConfig) {
  if (!componentPath) {
    throw new Error('Parameter componentPath is required.');
  }
  if (!moduleInfo) {
    throw new Error('Parameter moduleInfo is required.');
  }

  this.componentPath = componentPath;
  this.moduleInfo = moduleInfo;

  if (moduleInfo.framing) {
    this.name = moduleInfo.framing.name || moduleInfo.name;
    this.moduleName = moduleInfo.name;
    if (!this.name) {
      throw new Error('Invalid component: name parameter is missing from package.json.');
    }

    if (!moduleInfo.main) {
      throw new Error('Invalid component: main parameter is missing from package.json.');
    }
    this.componentMainPath = './' + path.join(componentPath, moduleInfo.main);

    this.imports = moduleInfo.framing.imports;
    this.optionalImports = moduleInfo.framing.optionalImports;
    this.subDirectories = moduleInfo.framing.subDirectories;

    if (optionalConfig && 
        (!this.imports || this.imports.indexOf('config') < 0) && 
        (!this.optionalImports || this.optionalImports.indexOf('config') < 0) &&
        (this.name !== 'config')) {
      this.optionalImports = this.optionalImports || [];
      this.optionalImports.push('config');
    }
  } else {
    this.invalidComponent = true;
  }
}

function processComponentInfo(baseDirectory, directory, folderName, optionalConfig, callback) {
  var componentPath = './' + path.join(directory, folderName),
    moduleInfoPath = './' + path.join(componentPath, 'package.json');

  // TODO allow for package.json to be within index.js
  fs.stat(path.join(baseDirectory, moduleInfoPath), function (error) {
    if (error && error.code === 'ENOENT') { // there is no package.json
      callback(); return;
    }
    if (error) {
      callback(error); return;
    }

    var moduleInfo = loadModuleInfo(path.join(baseDirectory, moduleInfoPath));
    try {
      var componentInfo = new ComponentInfo(componentPath, moduleInfo, optionalConfig);
    } catch (ex) {
      callback(ex); return;
    }

    if (componentInfo.invalidComponent) {
      callback(); return;
    }

    callback(null, componentInfo);
  });
}

function listComponents(baseDirectory, directory, optionalConfig, callback) {
  if (!baseDirectory) {
    baseDirectory = '';
  }

  fs.readdir(path.join(baseDirectory, directory), function (error, files) {
    if (error && error.code === 'ENOENT') { // there are no components in the directory
      callback(null, []); return;
    }
    if (error) {
      callback(error); return;
    }

    var components = [];

    if (files.length === 0) {
      callback(null, components); return;
    }

    (function next(i) {
      if (i >= files.length) {
        callback(null, components); return;
      }

      var file = files[i];
      fs.stat(path.join(baseDirectory, directory, file), function (error, stat) {
        if (error) {
          callback(error); return;
        }

        if (stat.isDirectory()) {
          processComponentInfo(baseDirectory, directory, file, optionalConfig, function (error, componentInfo) {
            if (error) {
              callback(error); return;
            }

            if (componentInfo) {
              components.push(componentInfo);
            }
            next(i + 1);
          });
        } else if (stat.isFile()) {
          // TODO treat differently
          next(i + 1);
        } else {
          next(i + 1);
        }
      });
    }(0));
  });
}

function buildComponentList(baseDirectory, directories, useNodeModules, optionalConfig, callback) {
  if (callback === undefined) {
    callback = optionalConfig;
    optionalConfig = false;
  }

  if (!baseDirectory) {
    baseDirectory = '';
  }

  if (!directories) {
    directories = [];
  }

  var components = [], directory, nodeModulesDirectory = './node_modules', base = path.resolve(baseDirectory);
  directories = directories.concat();

  if (useNodeModules) {
    do {
      directory = path.join(base, nodeModulesDirectory);
      try {
        fs.accessSync(directory, fs.F_OK);
        directories.push(nodeModulesDirectory);
        nodeModulesDirectory = path.join('../', nodeModulesDirectory);
      } catch (ex) {
        break;
      }
    } while (directory !== path.resolve('/node_modules'));
  }

  if (!directories || directories.length === 0) {
    callback(null, components); return;
  }

  (function next(i) {
    if (i >= directories.length) {
      callback(null, components); return;
    }

    listComponents(baseDirectory, directories[i], optionalConfig, function (error, directoryComponents) {
      if (error) {
        callback(error); return;
      }

      if (directoryComponents) {
        directories = directories.concat(
          [].concat.apply([], directoryComponents
            .filter(function (componentInfo) {
              return componentInfo.subDirectories && componentInfo.subDirectories.length > 0;
            })
            .map(function (componentInfo) {
              return componentInfo.subDirectories.map(function (subDirectory) {
                return path.join(componentInfo.componentPath, subDirectory);
              });
            }))
        );
      }

      components = components.concat(directoryComponents);
      next(i + 1);
    });
  }(0));
}

function DependencyGraphNode(componentInfo) {
  this.componentInfo = componentInfo;
  this.dependencyCount = 
    ((componentInfo.imports && componentInfo.imports.length) || 0) +
    ((componentInfo.optionalImports && componentInfo.optionalImports.length) || 0);
  this.parents = [];
  this.children = [];
}

DependencyGraphNode.prototype.toInitializationPath = function () {
  return new InitializationPath(this);
};

function InitializationPath(node, level) {
  if (Array.isArray(node)) {
    this.nodes = node;
  } else if (node.nodes) { // duck type
    this.nodes = node.nodes;
  } else {
    level = level || 0;
    var paths = [], i = 0, childNode = null, childNodes = null, maxLevel = 0, maxLevelLength = 0;
    
    while (i < node.children.length) {
      childNode = node.children[i++];
      childNodes = new InitializationPath(childNode, level + 1);
      if (childNodes.nodes.length > 0) {
        paths.push(childNodes.nodes);
        if (maxLevel < childNodes.nodes[0].level) {
          maxLevel = childNodes.nodes[0].level;
          maxLevelLength = childNodes.nodes.length;
        }
      }
    }

    paths.forEach(function (nodes) {
      if (nodes.length < maxLevelLength) {
        var levelChange = maxLevel - nodes[0].level;

        nodes.forEach(function (node) {
          node.level += levelChange;
        });
      }
    });

    var nodes = [].concat.apply([], paths);

    nodes.push({
      level: level,
      dependencyCount: node.dependencyCount,
      dependencies: node.children.map(function (node) { return node.componentInfo.name; }),
      componentInfo: node.componentInfo
    }); // add self

    this.nodes = nodes;
  }

  // sort  by level descending, dependency count ascending
  this.nodes = this.nodes.sort(function (nodeA, nodeB) {
    var sort = 
      nodeB.level - nodeA.level || 
      nodeA.dependencyCount - nodeB.dependencyCount;
    return sort;
  });

  // Because dependencies are likely to have multiple parents,
  // we need to filter out the extra initilizations. Subsequent parents
  // will just use the already initialized interface.
  var unique = {};
  this.nodes = this.nodes.filter(function (node) {
    return unique[node.componentInfo.name]
      ? false
      : !!(unique[node.componentInfo.name] = true); 
  });
}

// union two initialization paths together... needs a little more work
InitializationPath.prototype.union = function (path) {
  var i, j, k, levelChange, nodes = this.nodes;

  for (i = 0; i < path.nodes.length; ++i) {
    for (j = 0; j < this.nodes.length; ++j)
      if (path.nodes[i].componentInfo.name === this.nodes[j].componentInfo.name) {
        if (path.nodes[i].level > this.nodes[j].level) {
          levelChange = path.nodes[i].level - this.nodes[j].level;
          for (k = j; k < this.nodes.length; ++k) {
            this.nodes[k].level += levelChange;
          }
        }
        break;
      }
    if (j >= this.nodes.length) {
      nodes.push(path.nodes[i]);
    }
  }

  var unionPath = new InitializationPath(nodes);
  // console.log(path.nodes.map(function (node) { return node.level + ' ' + node.componentInfo.name}));
  return unionPath;
};

function processPostInitializeQueue(postInitializeQueue, callback) {
  postInitializeQueue.forEach(function (postInitialize) {
    postInitialize();
  });

  callback();
}

// check if all dependencies for a component have initialized
function canInitialize(dependencies, initialized) {
  return !dependencies || 
    dependencies.length === 0 || 
    dependencies.every(function (name) {
      return !!initialized[name];
    });
}

function initializeComponent(componentInstance, imports, optionalConfig, callback) {
  function onInitialized(error, componentInterface) {
    callback(error, componentInterface);
  }

  if (optionalConfig && componentInstance.initialize.length === 3) {
    var config = imports.config
      ? imports.config.load(componentInstance)
      : { };

    return componentInstance.initialize(config, imports, onInitialized);
  }

  var promise = componentInstance.initialize(imports, onInitialized);
  if (promise && promise.then) {
    promise.then(function (componentInterface) {
      onInitialized(null, componentInterface);
    }, onInitialized);
  }
}

function buildComponentImports(componentInfo, initializedComponentNodes) {
  var imports = {};
  if (componentInfo.imports) {
    componentInfo.imports.forEach(function (name) {
      imports[name] = initializedComponentNodes[name].componentInterface;
    });
  }
  if (componentInfo.optionalImports) {
    componentInfo.optionalImports
      .filter(function (name) {
        return !!initializedComponentNodes[name];
      })
      .forEach(function (name) {
        imports[name] = initializedComponentNodes[name].componentInterface;
      });
  }

  return imports;
}

InitializationPath.prototype.execute = function (baseDirectory, optionalConfig, callback) {
  if (callback === undefined) {
    callback = optionalConfig;
    optionalConfig = false;
  }

  var _this = this;
  var initialized = {}, initializing = 0, errors = [], postInitializeQueue = [];
  
  if (!baseDirectory) {
    baseDirectory = '';
  }

  // decrement initializing until all asynchronously initilizations have completed
  function done(error) {
    if (error) {
      errors.push(error);
    }
    if (--initializing <= 0) {
      if (errors && errors.length) {
        var errorResult = new Error('Errors occurred during initialization.');
        errorResult.initializationErrors = errors;
        callback(errorResult);
      } else {
        processPostInitializeQueue(postInitializeQueue, callback);
      }
    }
  }

  var i = 0;
  // Walks through the initialization path as asynchronously as possible.
  // does not start initilization if a component dependency has not initialized.
  // steps:
  //  1) if there are no nodes left, exit
  //  2) check if the current node can be initialized by validating dependencies have initialized
  //     if it can, proceed, else, exit
  //  5) increment i so the next iteration can initialize the next component
  //  4) create the params dictionary for the component's initialize function
  //  5) create the imports dictionary for the component's initialize function
  //  6) load the component if it has not already by some other mechanism
  //  7) increment initializing so that done does not exit prematurely
  //  8) begin initialize of the component
  //  9) call next so that another component can possibly initialize
  //  10) if initialization errored, pass the error to done, else mark component as initialized
  //  10) call done and call next
  (function next() {
    if (i >= _this.nodes.length) {
      return;
    }

    var node = _this.nodes[i];

    if (!canInitialize(node.dependencies, initialized)) {
      return;
    }

    ++i;
    var imports = buildComponentImports(node.componentInfo, initialized);

    if (!node.componentInterface) {
      if (!node.componentInstance) {
        node.componentInstance = loadComponent(path.join(baseDirectory, node.componentInfo.componentMainPath));
      }

      if (node.componentInstance.postInitialize) {
        postInitializeQueue.push(node.componentInstance.postInitialize);
      }

      ++initializing;
      try {
        node.componentInstance.initialize.componentInfo = node.componentInfo;
        initializeComponent(node.componentInstance, imports, optionalConfig, function (error, componentInterface) {
          if (optionalConfig && error && !(error instanceof Error) && error.toString() !== '[object Error]') {
            componentInterface = error;
            error = null;
          }

          if (error) {
            error.componentNode = node;
            done(error); return;
          }

          initialized[node.componentInfo.name] = node;
          node.componentInterface = componentInterface || {}; // if there is no interface, not a problem

          next();
          done();
        });
      } catch (ex) {
        ex.componentNode = node;
        done(ex);
      }
    }
    next();
  }());
};

function addImport(nodeLookup, node, optional, name) {
  // if not optional throw error if dependency is missing
  if (!nodeLookup[name]) {
    if (optional) {
      return;
    }

    throw new Error('Missing dependency ' + name + ' for ' + node.componentInfo.name);
  }

  // add dependency to node's children
  node.children.push(nodeLookup[name]);
  // add node to dependency's parents
  nodeLookup[name].parents.push(node);
}

function dependencyGraphs(components, callback) {
  var graphs = {},
    nodes = components.map(function (componentInfo) {
      return new DependencyGraphNode(JSON.parse(JSON.stringify(componentInfo)));
    }),
    nodeLookup = {};

  try {
    // build lookup for all component nodes for dependency graph
    nodes.forEach(function (node) {
      // If the node exists then a component with higher precedence has already been loaded.
      if (nodeLookup[node.componentInfo.name] || nodeLookup[node.componentInfo.moduleName]) {
        return;
      }

      nodeLookup[node.componentInfo.name] = nodeLookup[node.componentInfo.moduleName] = node;
    });

    // setup children and parents for each node
    nodes.forEach(function (node) {
      var addNodeImport = addImport.bind(null, nodeLookup, node);
      if (node.componentInfo.imports) {
        node.componentInfo.imports.forEach(addNodeImport.bind(null, false));
      }
      if (node.componentInfo.optionalImports) {
        node.componentInfo.optionalImports.forEach(addNodeImport.bind(null, true));
      }
    });

    // get roots for identify dependency graphs
    nodes
      .filter(function (node) {  // roots
        return !node.parents || node.parents.length === 0;
      })
      .forEach(function (node) {
        graphs[node.componentInfo.name] = node;
      });
  } catch (e) {
    callback(e);
    return;
  }

  callback(null, graphs);
}

function toInitializationPath(rootDependencyGraphs) {
  // Generate initilization path for each root node and then reduce to 
  // a single initilization path.
  var initializationPath = rootDependencyGraphs  
    .map(function (node) {
      return node.toInitializationPath();
    })
    .reduce(function (fullPath, path) {
      if (!fullPath) {
        return path;
      }

      return fullPath.union(path);
    }, null);

  return initializationPath;
}

function executeComponents(baseDirectory, rootDependencyGraphs, optionalConfig, callback) {
  if (callback === undefined) {
    callback = optionalConfig;
    optionalConfig = false;
  }

  var initializationPath = toInitializationPath(rootDependencyGraphs);

  initializationPath.execute(baseDirectory, optionalConfig, callback);
}

module.exports.buildComponentList = buildComponentList;
module.exports.dependencyGraphs = dependencyGraphs;
module.exports.DependencyGraphNode = DependencyGraphNode;
module.exports.InitializationPath = InitializationPath;
module.exports.toInitializationPath = toInitializationPath;
module.exports.executeComponents = executeComponents;
