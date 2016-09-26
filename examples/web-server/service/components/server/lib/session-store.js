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

const Store = require('express-session').Store;
const util = require('util');
const fs = require('fs');

module.exports = SessionStore;

function SessionStore() {
  Store.call(this);
  this.sessions = Object.create(null);
}
util.inherits(SessionStore, Store);

SessionStore.prototype.all = function all(callback) {
  if (!callback) return;

  const sessions = Object.keys(this.sessions).map((sessionId) => {
    return this._getSession(sessionId);
  });

  return sessions;
};

SessionStore.prototype.clear = function clear(callback) {
  if (!callback) return;

  this.sessions = Object.create(null);
  callback();
};

SessionStore.prototype.destroy = function destroy(sessionId, callback) {
  delete this.sessions[sessionId];

  callback();
};

SessionStore.prototype.get = function get(sessionId, callback) {
  if (!callback) return;

  if (Object.keys(this.sessions).length === 0) {
    fs.readFile('./sessions.txt', 'utf8', (error, data) => {
      if (error && error.code !== 'ENOENT') {
        return callback(error);
      }
      if (data) {
        this.sessions = JSON.parse(data);
      }
      callback(null, this._getSession(sessionId));
    });
  } else {
    callback(null, this._getSession(sessionId));
  }
};

SessionStore.prototype.set = function set(sessionId, session, callback) {
  this.sessions[sessionId] = JSON.stringify(session);
  fs.writeFile('./sessions.txt', JSON.stringify(this.sessions, null, 2), 'utf8', () => callback());
};

SessionStore.prototype.length = function length(callback) {
  callback(null, Object.keys(this.sessions).length);
};

SessionStore.prototype.touch = function touch(sessionId, session, callback) {
  var currentSession = this._getSession(sessionId);

  if (currentSession) {
    currentSession.cookie = session.cookie;
    this.set(sessionId, currentSession);
  }

  callback();
};

SessionStore.prototype._getSession = function getSession(sessionId) {
  var session = this.sessions[sessionId];

  if (!session) {
    return null;
  }

  session = JSON.parse(session);

  var expires = typeof session.cookie.expires === 'string'
    ? new Date(session.cookie.expires)
    : session.cookie.expires;
  if (expires && expires <= Date.now()) {
    this.destroy(sessionId, () => {});
    return null;
  }

  return session;
};