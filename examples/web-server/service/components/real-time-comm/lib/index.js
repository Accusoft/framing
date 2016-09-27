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

function Channel(socket) {
  this.socket = socket;
  this.socket.channel = this;

  if (!socket.handshake.session.sessionId) {
    socket.handshake.session.sessionId = socket.id;
    socket.handshake.session.save();
  }

  this.session = socket.handshake.session;

  console.log(`client ${socket.handshake.session.sessionId} connected to ${socket.nsp.name}`);

  this.socket.on('disconnect', () => this.closeChannel());
}

Channel.prototype.closeChannel = function () {
  console.log(`client ${this.socket.handshake.session.sessionId} disconnected from ${this.socket.nsp.name}`);
};

function CommServer(socketio, sessionMiddleware, cookieParser, httpServer, serverSession) {
  this.channels = new Set();
  this.io = socketio(httpServer);
  this.session = sessionMiddleware(serverSession, cookieParser());

  this.openNamespace('/');
}

CommServer.prototype.openNamespace = function (name) {
  return this.io.of(name).use(this.session)
    .on('connection', (socket) => this.openChannel(socket));
};

CommServer.prototype.closeChannel = function (channel) {
  this.channels.delete(channel);
};

CommServer.prototype.openChannel = function (socket) {
  const channel = new Channel(socket);
  this.channels.add(channel);

  socket.on('disconnect', () => this.closeChannel(channel));
};

module.exports.initialize = (imports) => {
  console.log('real-time-comm initialized');
  const comm = new CommServer(
    require('socket.io'),
    require('express-socket.io-session'),
    require('cookie-parser'),
    imports.server.httpServer,
    imports.server.session
  );

  return Promise.resolve(comm);
};