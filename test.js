const logger = require('./src/logger');


logger.info("Info message!", { foo: 123 });
logger.debug("Debug message!", { foo: 123 });
logger.error("Debug message!", { error: new Error('Some error payload!') });