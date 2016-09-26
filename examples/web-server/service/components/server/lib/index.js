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

function Server(http, express, sessionMiddleware, cookieParser, sessionStore, options) {
  this.app = express();
  this.server = http.Server(this.app);
  this.session = sessionMiddleware({
    store: new sessionStore(),
    secret: options.session.secret,
    resave: true,
    saveUninitialized: true
  });
  this.app.use(cookieParser(options.session.secret));
  this.app.use(this.session);

  this.options = options;
}

Server.prototype.initialize = function (options) {
  if (!options) {
    options = {};
  }
  return new Promise((resolve, reject) => {
    this.server.listen(options.port || this.options.port, (error) => {
      if (error) {
        return reject(error);
      }

      resolve();
    });
  });
};

module.exports.initialize = () => {
  const express = require('express');
  const server = new Server(
    require('http'),
    express,
    require('express-session'),
    require('cookie-parser'),
    require('./session-store'),
    {
      port: 8080,
      session: {
        secret: 'my-secret'
      }
    }
  );

  return server.initialize()
    .then(() => {
      console.log('server initialized');
      return {
        middleware: {
          static: express.static
        },
        httpServer: server.server,
        app: server.app,
        session: server.session
      };
    });
};