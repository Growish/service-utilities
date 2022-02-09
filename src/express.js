const apiMiddleware = require('./api-middleware');
const logger = require('./logger');

let app;

module.exports.init = _app => {

    app = _app;
    app.use(apiMiddleware);

};

module.exports.setController = (controllerName, route, method, fn, middlewares = []) => {

    const ctrl = async function(req, res) {
        try {
            logger.debug('Running...', { tagLabel: controllerName });
            await fn(req, res);
        } catch (error) {
            res.apiErrorResponse(error, controllerName);
        }
    };

    return app[method](route, ...middlewares, ctrl);

};