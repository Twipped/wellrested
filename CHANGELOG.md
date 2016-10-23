
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
