# Framing Web Server Example

This example shows how to use Framing components to divide a web server application into distinct sections or concerns.

## Table of Contents
- [Setup and Run](#setup-and-run)
- [Components](#components)
- [For Development](#for-development)

## Setup and Run
1. ```npm install```
2. ```npm start```

The [postinstall](https://docs.npmjs.com/misc/scripts) will automatically execute the **build** gulp task in the client component.

## Components
These are the components that comprise the web server. The application has been divided into the server, client, real time comm, and chat components.

### Server
The server component sets up the necessary infrastructure for a bare-bones web server using the [express](http://expressjs.com/) web framework. It enables a basic file-system based session store for cookies. Anything that wishes to route through the web server would import from this component.

### Client
The client component comprises the routes and views for the client browser. It uses [nunjucks](https://mozilla.github.io/nunjucks/) and [webpack](https://webpack.github.io/) to build the UI in the browser. Gulp is used to build the JavaScript bundle.

### Real Time Comm
The real-time-comm component enables [socket.io](http://socket.io/) for the server. It imports from the server component and then enables the socket io listeners.

### Chat
The chat component imports from the real-time-comm component and establishes the chat namespace in socket.io and performs some basic messaging with the client browsers.

## For Development
1. ```npm run debug```
2. ```npm run dev-ui```