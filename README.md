# WellRested

WellRested is a promise based client wrapper around [superagent](http://npm.im/superagent) and [path-to-regexp](http://npm.im/path-to-regexp) to create pre-configured clients for http services.

[![NPM version](https://img.shields.io/npm/v/wellrested.svg)](http://badge.fury.io/js/wellrested)
[![Licensed MIT](https://img.shields.io/npm/l/wellrested.svg)](https://github.com/ChiperSoft/wellrested/blob/master/LICENSE.txt)
[![Nodejs 4+](https://img.shields.io/badge/node.js-%3E=_4 LTS-brightgreen.svg)](http://nodejs.org)
[![Downloads](http://img.shields.io/npm/dm/wellrested.svg)](http://npmjs.org/wellrested)
[![Build Status](https://img.shields.io/travis/ChiperSoft/wellrested.svg)](https://travis-ci.org/ChiperSoft/wellrested)

## Installation

WellRested requires superagent 7.1 or later be installed alongside.

```
npm install superagent wellrested
```

## Example

```js
var wellrested = require('wellrested');
var client = wellrested({
  baseUrl: 'http://example.com',
  headers: { Accepts: 'application/json' },
  endpoints: {
    'user': '/user/:username',
    'message': '/message/:messageid?',
  },
  mixins: {
    getUser (username) {
      return this.user.get({ username }).then();
    },
    createMessage (contents) {
      return this.message.post()
        .send({ contents })
        .then();
    },
    getMessage (messageid) {
      return this.message.get({ messageid }).then();
    }
  }
});

client.createMessage('Test message').then((reply) => console.log(reply));
```

## Usage

- `client = wellrested(config)` - Takes a configuration object and returns a client.

- `request = client(method, url, [parameters])`: Creates a promise extended superagent request for the method and url, resolving the url against the `baseUrl` in the config. `parameters` is an object of substitution values for any url placeholders.

- `request = client.METHOD(url, [parameters])`: METHOD may be any of the following methods: get, post, put, delete, patch, head. The methods available are configurable by passing your own `methods` array of names on the config object (see below).

- `request = client.ENDPOINT.METHOD([parameters])`: ENDPOINT is the key name of any of the endpoints provided on the config object (see below).

- `request.end()`: Starts the superagent request and returns a promise that will resolve with the response object. If the server responds with a 4xx or 5xx error code, the promise will reject with the superagent error.

- `request.then([resolved], [rejected])`: Starts the superagent request and resolves only the parsed response from the request.  If the response body is not parsable, it will resolve with the body text. The function may be invoked with no arguments to simply return a promise instead of attaching handler functions.

## Config Options

- `baseUrl`: The root url of the http service to interact with.

- `headers`: An object hash of HTTP headers to set on every request.

- `endpoints`: An object hash of name/url values for service endpoint shortcuts. These URLs may contain express style placeholders (ex: `/resource/:id/`) which get replaced with values at the initialization of the request.

- `mixins`: The mixins object is an optional named set of functions to be mixed into the base client object. These functions have their `this` context hard bound to the client object at creation time.

- `auth`: The auth config setting lets you define the authentication details for the Authorization header on all requests. If this value is set to an object in the form of `{ user, pass }` then the requests will be setup for HTTP Basic Auth. If a string is provided then the requests will be setup with the string as a Bearer Token. Note, these may also be done per-request via the usual superagent methods.
