/* eslint no-shadow: 0 */

var test = require('tap').test;
var nock = require('nock');
var wellrested = require('./');

test('request factories', (t) => {

	var config = {
		baseUrl: 'http://example.com',
		headers: { Accepts: 'text/text' },
		endpoints: {
			'user': '/user/:username',
			'message': '/message/:messageid?',
		},
		mixins: {
			getUser (username) {
				return this.user.get({ username }).then();
			},
		},
	};

	var client = wellrested(config);

	t.afterEach((done) => {
		nock.cleanAll();
		done();
	});

	t.test('invoking client directly', (t) => {
		nock(config.baseUrl, {
			reqheaders: {
				'Accepts': 'text/text',
			},
		})
			.get('/foo/baz')
			.reply(200, { ok: true });

		return client('get', '/foo/:bar', { bar: 'baz' })
			.end().then((res) => {
				t.deepEqual(res.body, { ok: true }, 'Got back the nocked response');
			});
	});

	t.test('invoking client method', (t) => {
		nock(config.baseUrl)
			.get('/foo/baz')
			.reply(200, { ok: true });

		return client.get('/foo/:bar', { bar: 'baz' })
			.then((body) => {
				t.deepEqual(body, { ok: true }, 'Got back the nocked response');
			});
	});

	t.test('invoking endpoint client', (t) => {
		nock(config.baseUrl)
			.get('/user/USERNAME')
			.reply(200, { ok: true });

		return client.user('get', { username: 'USERNAME' })
			.then((body) => {
				t.deepEqual(body, { ok: true }, 'Got back the nocked response');
			});
	});

	t.test('invoking endpoint method', (t) => {
		nock(config.baseUrl)
			.post('/message')
			.reply(200, { ok: true });

		return client.message.post()
			.then((body) => {
				t.deepEqual(body, { ok: true }, 'Got back the nocked response');
			});
	});

	t.test('invoking endpoint method without required param', (t) => {
		nock(config.baseUrl)
			.get('/user')
			.reply(200, { ok: true });

		return client.user.get({})
			.then(
				() => t.fail('Request should have rejected'),
				(err) => {
					t.pass('Request failed');
					t.equal(err.message, 'Expected "username" to be defined');
				}
			);
	});

	t.test('invoking a mixin', (t) => {
		nock(config.baseUrl)
			.get('/user/USERNAME')
			.reply(200, { ok: true });

		return client.getUser('USERNAME')
			.then((body) => {
				t.deepEqual(body, { ok: true }, 'Got back the nocked response');
			});
	});

	t.end();
});


test('basic auth', (t) => {

	var config = {
		baseUrl: 'http://example.com',
		auth: {
			user: 'USERNAME',
			pass: 'PASSWORD',
		},
	};

	var client = wellrested(config);

	t.afterEach((done) => {
		nock.cleanAll();
		done();
	});

	t.test('performs a request with the correct basic auth', (t) => {
		nock(config.baseUrl)
			.put('/user/USERNAME')
			.basicAuth({
				user: 'USERNAME',
				pass: 'PASSWORD',
			})
			.reply(200, { ok: true });

		return client.put('/user/USERNAME')
			.then((body) => {
				t.deepEqual(body, { ok: true }, 'Got back the nocked response');
			});
	});

	t.test('performs a request with incorrect basic auth', (t) => {
		nock(config.baseUrl)
			.put('/user/USERNAME')
			.basicAuth({
				user: 'QWERTY',
				pass: 'ASDFGH',
			})
			.reply(200, { ok: true });

		return client.put('/user/USERNAME')
			.then(
				() => t.fail('Request should have failed'),
				() => t.pass('Request failed')
			);
	});

	t.end();
});

test('bearer token', (t) => {

	var config = {
		baseUrl: 'http://example.com',
		auth: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
	};

	var client = wellrested(config);

	t.afterEach((done) => {
		nock.cleanAll();
		done();
	});

	t.test('performs a request with the correct auth token', (t) => {
		nock(config.baseUrl, {
			reqheaders: {
				'Authorization': 'Bearer ABCDEFGHIJKLMNOPQRSTUVWXYZ',
			},
		})
			.patch('/user/USERNAME')
			.reply(200, { ok: true });

		return client.patch('/user/USERNAME')
			.then((body) => {
				t.deepEqual(body, { ok: true }, 'Got back the nocked response');
			});
	});

	t.test('performs a request with incorrect auth token', (t) => {
		nock(config.baseUrl, {
			badheaders: {
				'Authorization': 'Bearer ABCDEFGHIJKLMNOPQRSTUVWXYZ',
			},
		})
			.patch('/user/USERNAME')
			.basicAuth({
				user: 'QWERTY',
				pass: 'ASDFGH',
			})
			.reply(200, { ok: true });

		return client.patch('/user/USERNAME')
			.then(
				() => t.fail('Request should have failed'),
				() => t.pass('Request failed')
			);
	});

	t.end();
});

test('deep endpoints and mixins', (t) => {

	var config = {
		baseUrl: 'http://example.com',
		endpoints: {
			'user': '/user/:username',
			'user.messages': '/user/:username/messages',
			orders: {
				byId: '/order/:orderid',
				byType: '/orders/type/:type',
			},
		},
		mixins: {
			user: {
				getUser (username) {
					return this.user.get({ username }).then();
				},
				getMessages (username) {
					return this.user.messages.get({ username }).then();
				},
			},
			'orders.getById': function (id) {
				return this.orders.byId.get({ orderid: id }).then();
			},
			'orders.getByType': function (type) {
				return this.orders.byType.get({ type }).then();
			},
		},
	};

	var client = wellrested(config);

	t.afterEach((done) => {
		nock.cleanAll();
		done();
	});

	t.test('deep endpoints, nested mixins', (t) => {
		nock(config.baseUrl)
			.get('/user/USERNAME')
			.reply(200, { ok: true });

		return client.user.getUser('USERNAME').then((body) => {
			t.deepEqual(body, { ok: true }, 'Got back the nocked response');
		});
	});

	t.test('deep endpoints, nested mixins, part 2', (t) => {
		nock(config.baseUrl)
			.get('/user/USERNAME/messages')
			.reply(200, { ok: true });

		return client.user.getMessages('USERNAME').then((body) => {
			t.deepEqual(body, { ok: true }, 'Got back the nocked response');
		});
	});

	t.test('nested endpoints, deep mixins', (t) => {
		nock(config.baseUrl)
			.get('/orders/type/TYPE')
			.reply(200, { ok: true });

		return client.orders.getByType('TYPE').then((body) => {
			t.deepEqual(body, { ok: true }, 'Got back the nocked response');
		});
	});


	t.end();
});
