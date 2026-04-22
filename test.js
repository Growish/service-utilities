const express = require('express');

const utilities = require('./src');

const shouldStartServer = process.argv.includes('--server');
const tagLabel = utilities.logger.genTag('test');

console.log("Logger config:", utilities.logger.config);

utilities.logger.info("Info message!", { tagLabel, foo: 123 });
utilities.logger.debug("Debug message!", { tagLabel, foo: 123 });
utilities.logger.warn("Warn message!", { tagLabel, enabled: true });
utilities.logger.error("Error message!", { tagLabel, error: new Error('Some error payload!') });
utilities.logger.stream.write("GET /health 200 1ms\n");

utilities.dependencyLocator.register('example', function () {
    console.log("Hello from example!", arguments)
});

utilities.dependencyLocator.get('example')("foo", "bar");

if(!shouldStartServer) {
    setTimeout(() => process.exit(0), 250);
    return;
}

const app = express();

app.use(express.json());

utilities.express.init(app, null, 'it');

const dummyUser = {
    mfaSecret: undefined
};

new utilities.express.Service('fooCTRL')
    .isPost()
    .isPublic()
    .respondsAt('/test')
    .setMiddlewares([
        new utilities.express.Mfa(dummyUser.mfaSecret).setCallback((secret)=>{
            console.log("Store this secret", secret);
        }).getMiddleware(),
        new utilities.express.Middleware('mid1').controller((req, res, next, logger)=> { logger.debug("Hello 1!"); next(); }),
        new utilities.express.Middleware('mid2').controller((req, res, next, logger)=> { logger.debug("Hello 2!"); next(); }),
    ])
    .setInputFields({
        foo: 'string:min=2,max=10,required,label=The foo',
        email: 'string:email,required',
        number: 'number:min=10,max=90',
        boolean: 'boolean',
        date: 'date:iso'
    })
    .controller(async (req, res, logger) => {

        logger.info("Ciao mondo!", { foo: 'bar' });

        res.resolve("OK")


    });


setInterval(()=>{
    utilities.state.increment('foo');
}, 5000);

setInterval(()=>{
    console.log(utilities.state.get('foo'));
}, 6000);
app.listen(3080, () => console.log("Server ready!"));
