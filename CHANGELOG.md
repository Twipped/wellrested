
2.0.0 / 2019-04-04
==================

  * BREAKING CHANGE: Updated Superagent from 3.1 to 5.0.2.

    This necessitated increasing the minimum node version from v4. As Node 6 is reaching end of life this month, I have chosen to take the minimum version directly to 8.

    There shouldn't be any other changes in behavior from this update, but as Superagent went through a total rewrite for 5.0, it could happen.

    `.end()` and `.then()` functionality on the wellrested client is unchanged, despite changes in Superagent's behavior on those functions.

    This fixes the Denial of Service warning given by NPM audit.

  * Wellrested no longer depends on Bluebird and just uses native promises
  * Fixed deprecation notice in Node 11 from URL.resolve()

1.1.0 / 2016-10-23
==================

  * Fixed a bug with mixin application if no endpoints were defined

  * Endpoints and Mixins can now be deeply nested, either via nested objects in config or via long object paths for keys.

    ```
    endpoints: {
    	'user': '/user/:username',
    	'user.messages': '/user/:username/messages',
    	orders: {
    		byId: '/order/:orderid',
    		byType: '/orders/type/:type',
    	},
    },
    ```
