const utilities = require('./src');


utilities.logger.info("Info message!", { foo: 123 });
utilities.logger.debug("Debug message!", { foo: 123 });
utilities.logger.error("Debug message!", { error: new Error('Some error payload!') });

utilities.serviceInjector.register('example', function () { console.log("Hello from example!", arguments)});

utilities.serviceInjector.get('example')("foo", "bar");

utilities.express.init({ use: function() { console.log("app use", arguments)}, post: ()=>{} });

console.log(new utilities.express.Service('foo')
    .isPost()
    .respondsAt('/test')
    .setMiddlewares([()=>{}])
    .controller(async (req, res) => {}));
