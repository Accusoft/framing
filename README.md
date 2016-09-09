# Framing

## Dependency Injection Made Simple
Framing was designed to simplify the creation of applications in Node.js by declaratively facilitating dependency injection. Further, Framing encourages best practices by promoting separation of concerns within the application by dividing the application logic into components.  

```
require('framing')
  .setBaseDir(__dirname)
  .run();
```

## Table of Contents
- [Installation](#installation)
- [Why Framing](#why-framing)
- [Components](#components)
- [Application Startup](#application-startup)
- [Command Line Arguments](#command-line-arguments)
- [Examples](#examples)
- [FAQ](FAQ.md)

## Installation
```
$ npm install framing
```

## Why Framing
Framing makes it easy to divide an application into components. A component is essentially a node module which allows developers to continue to leverage npm for building, deploying, and sharing of components.

Framing diverges from classical dependency injection in a few ways:
1. All components are singletons.
2. The application logic does not request components from a container or factory.
3. All components in the dependency graph are instantiated during startup.
4. Component instantiation is safely asynchronous, so any external dependencies can safely block the instantiation of dependents.

Framing does not simply manage the construction and reference to objects, but it also handles the application scaffolding. The application does not request components but rather declares the required components. From the declarations, Framing will build and execute the dependency tree.

Because the execution of the dependency tree for all the components occurs only once. Framing will not have an impact on application performance beyond slightly increasing the startup time.

## Components
A component in Framing is simply a node module with extra metadata within the **package.json** and an `initialize` function in the `main` code file. Components are by definition singletons within Framing, i.e., each instance of a component interface is shared across all dependents.

### Initialize Method
When the `initialize` method for the component executes, the component constructs the object interface for the component and returns the interface to Framing.

The initialize method can take two forms taking either a callback or returning a promise. For either, the first parameter, `imports` will be the dictionary of all dependencies keyed by their respective names for the component as they have been designated within the imports array of the framing metadata in the package.json.

If an exception is thrown directly within the initialize function's stack, Framing will catch and write the error to the standard out. However, if within an asynchronous function stack, the error will need to be passed through the callback or through the rejection of the promise. Otherwise, Framing will block waiting for the component to finish initializing. Once a component has errored, no additional components will initialize. Framing will wait for current components to finish with either resolved or rejected states and then return the error(s).

**Note:** Framing has no timeout; the application will wait until the components have all finished initializing or have thrown errors. 

#### With Callback
The initialize method takes two arguments:
- `imports` - **dictionary** The components that the current component depends on.
- `callback` - **function** Called when the component is ready, taking two arguments:
  - `error` - **object** If an error has occurred.
  - `componentInterface` - **object** The interface to the object.

```
module.exports.initialize = (imports, callback) => {
  let logger = imports.logger;
  let someService = imports['some-service'];

  callback({
    doSomething: callback => someService.getData(callback)
  });
};
```

#### Returning Promise
The initialize method takes one argument:
- `imports` - **dictionary** The components that the current component depends on.

`return value` - **Promise** Resolve with the component interface or reject with an error.

```
module.exports.initialize = (imports) => {
  let logger = imports.logger;
  let someService = imports['some-service'];

  return Promise.resolve({
    doSomething: () => someService.getData()
  });
};
```

### Framing Metadata
The framing metadata is defined in the **package.json**. The metadata expresses the name of the component and what components are to be imported.

#### Component Name
A component has two mechanisms for identifying itself: 
- `name` - **string** *required* This is the package name for the node module. Consider this property as the implementation name for the component.
- `framing.name` - **string** *optional* The Framing name should be considered as something akin to an interface name but without the interface contract. 

```
{
  "name": "my-service",
  "framing": {
    "name": "service"
  }
}
```

#### Importing Components
Importing components within Framing only requires specifying the names of the dependency components. The dependencies will be exposed as a dictionary by import name. 

- `framing.imports` - **array of strings** *optional* 

```
{
  "framing": {
    "imports": [ "service", "logger" ]
  }
}
```

When a dependent imports the component, it may use either the package name or the framing name. Then the component passed into the imports dictionary will be keyed by the name given in the imports array.

## Application Startup
When the application is run and after Framing has completed the generation of the dependency graphs, the application can select a component or several components that identify the entry point(s) of the application. The initialization path will be constructed and then executed by iterating over the path's nodes. The execution will attempt to process through the path by initializing, in parallel, all subsequent node components that have had all of their dependencies satisfied.

### Setting Up Framing

```
require('framing')
  .setBaseDir(__dirname)
  .run();
```

## Command Line Arguments

- `--debug` - Enables debug mode for Framing. This just causes Framing to output data like what components it has found. 

## Framing Object
### `setBaseDir()`
Sets the directory to begin the search for components.
#### Syntax
``` 
  framing.setBaseDir(path)
```
#### Parameters
- `path` - **string** The path (relative or absolute) from which to search for components.

### `run()`
Prompts Framing to build the dependency tree and execute the initialize method of all components within the tree.

Framing will automatically start all root level components in the dependency tree, but optionally the components that will be initialized may be set.
#### Syntax
``` 
  framing.run([entryPoint]);
```
#### Parameters
- `entryPoint` - **array of strings** Root component names to initialize.

## Examples

### Simple Component
#### package.json
```
{
  "name": "my-simple-component",
  "main": "index.js",
  "framing": {
    "name": "simple-component",
    "imports": []
  }
}
```
#### index.js
```
module.exports.initialize = (imports) => {
  return Promise.resolve({
    say: () => console.log('Hello, world!')
  });
};
```

### Simple Asynchronous Component
```
module.exports.initialize = (imports) => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve({
        say: () => console.log('Hello, world!')
      });
    }, 250);
  });
};
```

### Throwing an Error
#### Synchronously
If the currently executing stack is not asynchronous, then it is okay to throw an error.
```
module.exports.initialize = (imports) => {
  throw new Error('fail');

  // ...
};
```

#### Asynchronously
However, if the currently executing stack is asynchronous, then the error must be passed back either by callback or promise.

**Note:** Be careful to not call the callback before the component is actually ready.
```
module.exports.initialize = (imports, callback) => {
  setTimeout(() => {
    callback(new Error('fail'));
  }, 250);
};
```

```
module.exports.initialize = (imports) => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      reject(new Error('fail'));
    }, 250);
  });
};
```

## License
MIT

**©2016. Accusoft Corporation. All Rights Reserved.**