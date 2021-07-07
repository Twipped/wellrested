'use strict';

var { URL }    = require('url');
var compileurl = require('path-to-regexp').compile;
var request    = require('superagent');
var assert     = require('assert');

const hasOwn = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);
const isString = (input) => typeof input === 'string';
const isNumber = (input) => typeof input === 'number' && !isNaN(input);
const isUndefined = (input) => typeof input === 'undefined';
const isUndefinedOrNull = (input) => isUndefined(input) || input === null;
function isObject (input, strict = false) {
  if (!input) return false;
  if (typeof input !== 'object') return false;
  if (Array.isArray(input)) return false;
  if (!strict) return true;
  if (!(input instanceof Object)) return false;
  if (input.constructor !== Object.prototype.constructor) return false;
  return true;
}

function get (obj, path, defaultValue) {
  if (isUndefinedOrNull(path) || path === '') return false;
  if (isNumber(path)) path = [ String(path) ];
  else if (isString(path)) {
    if (hasOwn(obj, path)) return obj[path];
    path = path.split(/[,[\].]+?/);
  }
  const result = path.filter((s) => !isUndefinedOrNull(s) && s !== '').reduce((res, key) => (!isUndefinedOrNull(res) ? res[key] : res), obj);
  return isUndefined(result) || result === obj ? defaultValue : result;
}

function set (obj, path, value) {
  if (isUndefinedOrNull(path) || path === '') return false;
  if (isNumber(path)) path = [ String(path) ];
  else if (isString(path)) {
    if (hasOwn(obj, path)) {
      obj[path] = value;
      return obj;
    }

    path = path.split(/[,[\].]+?/);
  }
  const c = path.length - 1;
  path.filter((s) => s || s === 0).reduce((res, key, i) => {
    if (i === c) {
      res[key] = value;
      return true;
    }

    if (isObject(res[key]) || typeof res[key] === 'function') return res[key];
    return (res[key] = {});
  }, obj);
  return obj;
}

module.exports = exports = function (config) {
  var options = Object.assign({
    baseUrl: '',
    methods: [ 'get', 'post', 'put', 'delete', 'patch', 'head' ],
    headers: {},
    endpoints: {},
    mixins: null,
    auth: null,
    logError: function noop () {},
    logDebug: function noop () {},
  }, config);

  function client (method, url, params) {
    var failure;
    try {
      assert(method, 'No HTTP method was provided.');
      assert(url, 'No target URL was provided');
      assert(!params || typeof params === 'object', 'Expected an object for params, found ' + typeof params);

      if (~url.indexOf(':')) url = compileurl(url)(params || {});
      if (options.baseUrl) url = (new URL(url, options.baseUrl)).href;
    } catch (e) {
      // if any of the above fail, we need to save that
      // failure and return it on the promise
      failure = e;
      url = 'http://example.com';
    }

    var req = request(method, url);

    if (options.auth && typeof options.auth === 'object' && options.auth.user && options.auth.pass) {
      req.auth(options.auth.user, options.auth.pass);
    } else if (typeof options.auth === 'string') {
      req.set('Authorization', `Bearer ${options.auth}`);
    }

    if (options.headers && typeof options.headers === 'object') {
      Object.keys(options.headers).forEach((key) => {
        req.set(key, options.headers[key]);
      });
    }

    var originalEnd = req.end.bind(req);
    var originalThen = req.then.bind(req);

    req.end = (fn) => {
      if (failure) {
        options.logError(failure);
        if (fn) return fn(failure);
        return Promise.reject(failure);
      }

      return new Promise((resolve, reject) => {
        originalEnd((err, res) => {
          if (err) {
            options.logError(err);
            if (fn) return fn(failure);
            return reject(err);
          }

          options.logDebug(res);
          if (fn) return fn(null, res);
          return resolve(res);
        });
      });
    };

    req.then = (...args) => {
      if (failure) {
        options.logError(failure);
        return Promise.reject(failure).then(...args);
      }

      var p = originalThen();

      p = p.then(
        (res) => {
          options.logDebug(res);
          return res.body || res.text;
        },
        (err) => {
          options.logError(err);
          throw err;
        }
      );

      if (args.length) p = p.then(...args);
      return p;
    };

    return req;
  }

  client.options = options;

  options.methods.forEach((method) => {
    client[method] = (url, params) => client(method, url, params);
  });

  function buildEndpoints (trunk, endpoints) {
    Object.keys(endpoints).forEach((key) => {
      var endpoint = endpoints[key];
      if (endpoint && typeof endpoint === 'object') {
        if (!get(trunk, key)) set(trunk, key, {});
        return buildEndpoints(get(trunk, key), endpoint);
      }

      assert(!get(trunk, key), `Cannot add endpoint "${key}", key already exists.`);
      assert(endpoint, `No url was provided for the "${key}" endpoint`);

      var wrapper = (method, params) => client(method || 'get', endpoint, params);
      options.methods.forEach((method) => {
        wrapper[method] = (params) => client(method, endpoint, params);
      });

      set(trunk, key, wrapper);
    });
  }

  if (options.endpoints && typeof options.endpoints === 'object') {
    buildEndpoints(client, options.endpoints);
  }

  function applyMixins (trunk, mixins) {
    Object.keys(mixins).forEach((key) => {
      var mixin = mixins[key];
      if (mixin && typeof mixin === 'object') {
        if (!get(trunk, key)) set(trunk, key, {});
        return applyMixins(get(trunk, key), mixin);
      }

      assert(!get(trunk, key), `Cannot add mixin "${key}", key already exists.`);
      assert(typeof mixin === 'function', `The "${key}" mixin is not a function.`);

      set(trunk, key, mixin.bind(client));
    });
  }

  if (options.mixins && typeof options.mixins === 'object') {
    applyMixins(client, options.mixins);
  }

  return client;
};
