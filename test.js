const express = require('express');

const utilities = require('./src');


utilities.logger.info("Info message!", {foo: 123});
utilities.logger.debug("Debug message!", {foo: 123});
utilities.logger.error("Debug message!", {error: new Error('Some error payload!')});

utilities.dependencyLocator.register('example', function () {
    console.log("Hello from example!", arguments)
});

utilities.dependencyLocator.get('example')("foo", "bar");

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

app.listen(3080, () => console.log("Server ready!"));
