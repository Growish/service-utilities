const apiMiddleware = require('./api-middleware');
const logger = require('./logger');
const inputValidator = require('./input-validator');

let app;
let authMiddleware;
let locale;


const contextualizedLogger = context => ({
    debug: (message, payload) => logger.debug(message, { tagLabel: context.name, payload: payload|| undefined }),
    info: (message, payload) => logger.info(message, { tagLabel: context.name, payload: payload || undefined }),
    error: (message, payload) => logger.error(message, { tagLabel: context.name, payload: payload || undefined })
});

module.exports.init = (_app, _authMiddleware = null, _locale = 'en') => {

    app = _app;
    authMiddleware = _authMiddleware;
    app.use(apiMiddleware);
    locale = _locale;

};

module.exports.Mfa = class  Mfa {

    constructor(mfaUserSecret) {
        this.name = 'MFA';
        this.mfaUserSecret = mfaUserSecret;
    }

    async setCallback(cb) {

        this.cb = cb;

        return this;
    }

    getMiddleware() {

        const me = this;

        return (req, res, next) => {

            if(me.mfaUserSecret) {
                //Checks session in cookie
            }
            else if(req.body.mfaPin) {
                //Checks mfaPin with
            }
            else {
                //Shows QR code for MFA registration
                //Ask for first PIN (POST form to itself)

            }

            this.cb();
            next();
        };


    }

}

module.exports.Middleware  = class Middleware {

    constructor(name) {
        this.name = name;
    }

    controller(fn) {

        const me = this;

        return async function(req, res, next) {
            try {

                const logger = contextualizedLogger(me);
                logger.debug('Running...');
                await fn(req, res, next, logger);

            } catch (error) {

                res.apiErrorResponse(error, me.name);

            }
        };

    }

};

module.exports.Service = class Service {

    constructor(name) {
        this.name = name;
        this.method = 'get';
        this.middlewares = [];
        this.public = false;
        this.inputFields = null;
    }

    isGet() {
        this.method = 'get';
        return this;
    }

    isPost() {
        this.method = 'post';
        return this;
    }

    isPut() {
        this.method = 'put';
        return this;
    }

    isDelete() {
        this.method = 'delete';
        return this;
    }

    isAll() {
        this.method = 'all';
        return this;
    }

    isPublic() {
        this.public = true;
        return this;
    }

    respondsAt(route) {
        this.route = route;
        return this;
    }

    setMiddlewares(m) {
        this.middlewares = Array.isArray(m) ? m : [m];
        return this;
    }

    setInputFields(schema) {

        this.inputFields = schema;
        return this;

    }

    controller(fn) {

        const me = this;

        const ctrl = async function(req, res) {
            try {

                const logger = contextualizedLogger(me);
                logger.debug('Running...');

                if(me.inputFields) {
                    const errors = inputValidator.check(me.inputFields, req.params, req.body, locale);
                    if(errors)
                        return res.badRequest(errors);
                }

                await fn(req, res, logger);

            } catch (error) {

                res.apiErrorResponse(error, me.name);

            }
        };

        if(typeof authMiddleware === 'function' && !this.public)
            return app[this.method](this.route, authMiddleware, ...this.middlewares, ctrl);
        else if(typeof authMiddleware !== 'function' && !this.public)
            throw new Error("A private route was declared but there is no authentication middleware")
        else
            return app[this.method](this.route, ...this.middlewares, ctrl);

    }

};