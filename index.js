'use strict';

var { URL }    = require('url');
var compileurl = require('path-to-regexp').compile;
var request    = require('superagent');
var assert     = require('assert');
var get        = require('lodash.get');
var set        = require('lodash.set');

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
