const services = {};

module.exports.register = (name, fn) => {
    services[name] = fn;
};

module.exports.get = name => services[name];

module.exports.purge = name => delete services[name];