const apiMiddleware = require('./api-middleware');
const logger = require('./logger');

let app;

module.exports.init = _app => {

    app = _app;
    app.use(apiMiddleware);

};

module.exports.Service = class Service {

    constructor(name) {
        this.name = name;
        this.method = 'get';
        this.middlewares = [];
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

    respondsAt(route) {
        this.route = route;
        return this;
    }

    setMiddlewares(m) {
        this.middlewares = m;
        return this;
    }

    controller(fn) {

        const ctrl = async function(req, res) {
            try {
                logger.debug('Running...', { tagLabel: this.name });
                await fn(req, res);
            } catch (error) {
                res.apiErrorResponse(error, this.name);
            }
        };

        return app[this.method](this.route, ...this.middlewares, ctrl);

    }

};