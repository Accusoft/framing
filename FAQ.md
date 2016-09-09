# Framing FAQ

Framing is supposed to be easy, but sometimes there are subtle issues.

## Table of Contents
- [Dependency Injection](#dependency-injection)
- [Debugging](#debugging)
- [Initialization](#initialization)
- [Errors](#errors)
- [Testing](#testing)

## Dependency Injection
### What is Dependency Injection?

Dependency Injection is a form of Inversion of Control where object dependencies are instantiated and passed to dependent objects on behalf of the developer by a framework.

### What is Inversion of Control?

Classically, programs make the calls into libraries. This requires knowledge of how to instantiate or reference objects from the library in the calling code. With Inversion of Control the framework makes the calls to instantiate or reference objects. The inversion is that the framework is making the calls on behalf of the program. This benefits the application by providing a separation of concerns regarding business logic and how to reference and call libraries.

### Why do we care about Dependency Injection?

Dependency Injection decouples business logic from object instantiation logic. This keeps the code cleaner and easier to maintain as it's easier to replace and reuse objects that are injected. Further, this simplifies unit testing in that it is much easier to test the objects in isolation.

## Debugging
### How can Framing help me debug my applications?

Sometimes the components you think are loading are not the components that are actually loading. Perhaps there are more components than what you expected or other components are missing.

The ```--debug``` argument passed to your application will provide you information like where Framing is searching for components and components have been loaded.

```
node app.js --debug
```

## Initialization
### Why is Framing freezing when starting up?

Framing will block until a component finishes initialization. There is no timeout for a blocking component. If your application has not finished initializing, then are likely one or more components not returning by calling the callback for the ```initialize``` function or resolving the returned ```Promise``` object. 

```
module.exports.initialize = (imports, callback) => {
  callback({ /* component interface */ });
  // or
  return new Promise((resolve, reject) => {
    resolve({ /* component interface */ });
  });
}
```

### What is the order that Framing will initialize components?

Framing will order component initialization by:

1. By dependencies, i.e., whether a components dependencies have all initialized.
2. The order of the directories that Framing searched in.
3. The order that the system returned the component folders for each directory.

### What happens when two components share the same name?

The first component to be loaded by Framing, will be the component that is used. Framing will keep the components that it is initializing unique by component name. The order at which this uniqueness is applied is the order of precedence for the components.

### When should I use the package name rather than the Framing name?

In many cases, the package name and the Framing name will be the same value, but when they diverge, it would generally be best to use the Framing name rather than the package name. The package name must always be unique whereas the framing name does not have to be. This allows multiple components to share the same interface and be interchangeable.

## Errors
### Why is Framing not registering that an error has occurred?

If your component has thrown an exception in a synchronous manner, Framing will catch the error and report it accordingly. However, if the error occurs asynchronously, then the error must be reported to Framing through either the callback for the ```initialize``` function or by rejecting the returned ```Promise``` object.

```
module.exports.initialize = () => {
  throw new Error('fail');
  // or 
  return new Promise((resolve, reject) => {
    reject(new Error('fail'));
  });
};
```

## Testing
### How do I unit test a Framing component?

Components are actually very easy to test because they have been written so that their dependencies are injected at runtime. This makes it very easy to create simple mocks or stubs for the component to use during the test. Because the component initialization is asynchronous, the test will have to be treated as asynchronous.

```
// logger stub
const loggerStub = {
  log: () => {}
};

describe('My awesome component', () => {
  describe('When tested', () => {
    it('does what it ought to.', (done) => {
      require('./my-component').initialize({
        logger: loggerStub
      }).then(component => {        
        expect(component.doSomething()).to.be.true;
        done();
      });
    });
  });
});
```

Sometimes, it makes more sense to test the private functions of the component. Because the public interface is passed through the initialization and not through the ```module.exports```, the module.exports can be used to expose various private functions for unit testing.

```
/// my-component.js
function somePrivateFunction() {
  return 'test';
}
module.exports.somePrivateFunction = somePrivateFunction;

module.exports.initialize = () => {
  return Promise.resolve({
    somePublicFunction: () => somePrivateFunction() 
  });
};

/// my-component.test.js 
describe('My awesome component', () => {
  describe('When tested', () => {
    it('does what it ought to.', () => {
      expect(require('./my-component').somePrivateFunction()).to.equal('test');
    });
  });
});