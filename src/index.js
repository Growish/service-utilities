module.exports = {
    logger: require('./logger'),
    notifier: require('./notifier'),
    state: require('./application-state'),
    githubHookExpress: require('./github-hook-express-controller'),
    mongooseErrorFormatterPlugin: require('./mongoose-error-formatter-plugin'),
    salesforce: require('./salesforce-sync'),
    express: require('./express'),
    serviceInjector: require('./service-injector')
};