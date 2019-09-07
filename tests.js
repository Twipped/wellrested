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
				return this.user.get({ username });
			},
		},
	};

	var client = wellrested(config);

	t.afterEach((done) => {
		nock.cleanAll();
		done();
	});

	t.only('invoking client directly', async (t) => {
		nock(config.baseUrl, {
			reqheaders: {
				'Accepts': 'text/text',
			},
		})
			.get('/foo/baz')
			.reply(200, { ok: true });

		var res = await client('get', '/foo/:bar', { bar: 'baz' }).end();

		t.deepEqual(res.body, { ok: true }, 'Got back the nocked response');
	});

	t.test('invoking client method', async (t) => {
		nock(config.baseUrl)
			.get('/foo/baz')
			.reply(200, { ok: true });

		var body = await client.get('/foo/:bar', { bar: 'baz' });
		t.deepEqual(body, { ok: true }, 'Got back the nocked response');
	});

	t.test('invoking endpoint client', async (t) => {
		nock(config.baseUrl)
			.get('/user/USERNAME')
			.reply(200, { ok: true });

		t.deepEqual(await client.user('get', { username: 'USERNAME' }), { ok: true }, 'Got back the nocked response');
	});

	t.test('invoking endpoint method', async (t) => {
		nock(config.baseUrl)
			.post('/message')
			.reply(200, { ok: true });


		t.deepEqual(await client.message.post(), { ok: true }, 'Got back the nocked response');
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
					t.equal(err.message, 'Expected "username" to be a string');
				}
			);
	});

	t.test('invoking a mixin', async (t) => {
		nock(config.baseUrl)
			.get('/user/USERNAME')
			.reply(200, { ok: true });


		t.deepEqual(await client.getUser('USERNAME'), { ok: true }, 'Got back the nocked response');
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

	t.test('performs a request with the correct basic auth', async (t) => {
		nock(config.baseUrl)
			.put('/user/USERNAME')
			.basicAuth({
				user: 'USERNAME',
				pass: 'PASSWORD',
			})
			.reply(200, { ok: true });

		t.deepEqual(await client.put('/user/USERNAME'), { ok: true }, 'Got back the nocked response');
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

	t.test('performs a request with the correct auth token', async (t) => {
		nock(config.baseUrl, {
			reqheaders: {
				'Authorization': 'Bearer ABCDEFGHIJKLMNOPQRSTUVWXYZ',
			},
		})
			.patch('/user/USERNAME')
			.reply(200, { ok: true });

		t.deepEqual(await client.patch('/user/USERNAME'), { ok: true }, 'Got back the nocked response');
	});

	t.test('performs a request with incorrect auth token', (t) => {
		nock(config.baseUrl, {
			badheaders: [
				'Authorization',
			],
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
				async getUser (username) {
					return await this.user.get({ username });
				},
				async getMessages (username) {
					return await this.user.messages.get({ username });
				},
			},
			'orders.getById': async function (id) {
				return await this.orders.byId.get({ orderid: id });
			},
			'orders.getByType': async function (type) {
				return await this.orders.byType.get({ type });
			},
		},
	};

	var client = wellrested(config);

	t.afterEach((done) => {
		nock.cleanAll();
		done();
	});

	t.test('deep endpoints, nested mixins', async (t) => {
		nock(config.baseUrl)
			.get('/user/USERNAME')
			.reply(200, { ok: true });


		t.deepEqual(await client.user.getUser('USERNAME'), { ok: true }, 'Got back the nocked response');
	});

	t.test('deep endpoints, nested mixins, part 2', async (t) => {
		nock(config.baseUrl)
			.get('/user/USERNAME/messages')
			.reply(200, { ok: true });

		t.deepEqual(await client.user.getMessages('USERNAME'), { ok: true }, 'Got back the nocked response');
	});

	t.test('nested endpoints, deep mixins', async (t) => {
		nock(config.baseUrl)
			.get('/orders/type/TYPE')
			.reply(200, { ok: true });

		t.deepEqual(await client.orders.getByType('TYPE'), { ok: true }, 'Got back the nocked response');
	});


	t.end();
});
