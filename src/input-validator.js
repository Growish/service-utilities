const Joi = require('joi');
const i18n = require('i18n');
const logger = require('./logger');

const supportedJoiTypes = ['string', 'number', 'any', 'boolean', 'date'];

i18n.configure({
    staticCatalog: {
        it: require('./validation-locales/it.json')
    },
    defaultLocale: 'en'
});

const stringToJoi = _expression => {

    //"string:min=1,max=2,required"

    const expression = _expression.toLowerCase().trim();

    if(typeof expression !== 'string')
        throw new Error("The validation expression must be a string");

    const elements = expression.split(":");

    if(elements.length <= 0 || elements.length > 2)
        throw new Error("The validation expression is invalid (" + expression + ")");

    if(!supportedJoiTypes.includes(elements[0]))
        throw new Error("Unsupported type: " + elements[0] + ". Supported types are: " + supportedJoiTypes.toString());

    const params = elements[1] ? elements[1].split(",") : [];

    let joiSchema = Joi[elements[0]]();

    params.forEach(param => {

        const paramComponents = param.split("=");

        if(joiSchema[paramComponents[0]] === undefined || joiSchema[paramComponents[0]] === null)
            throw new Error("Invalid parameter: " + paramComponents[0]);



        if(paramComponents[1]) {
            const castedParamComponent = isNaN(paramComponents[1]) ? paramComponents[1] : parseInt(paramComponents[1]);
            joiSchema = joiSchema[paramComponents[0]](castedParamComponent);
        }
        else
            joiSchema = joiSchema[paramComponents[0]]();

    });

    return joiSchema;

};

const objectToJoi = obj => {

    if(typeof obj !== 'object')
        throw new Error("The schema must be an object");

    const joiSchema = {};


    for(const key in obj) {
        if(typeof obj[key] === 'string')
            joiSchema[key] = stringToJoi(obj[key]);
        else if(typeof obj[key] === 'object')
            joiSchema[key] = objectToJoi(obj[key]);
        else
            throw new Error("Invalid schema on key: " + key);
    }

    return Joi.object(joiSchema);


};

module.exports.check = (schema, params, body, locale) => {

    const validationResults = objectToJoi(schema).validate(body, {
        abortEarly: false
    });

    i18n.setLocale(locale);

    if (!validationResults.error)
        return null;
    else {

        const response = {};

        validationResults.error.details.map(el => {
            const messageTranslated = i18n.__(el.type, el.context);
            const missingTranslation = messageTranslated === el.type;

            if(missingTranslation)
                logger.warn("Missing translation key, defaulting to Joi error message", {
                    tagLabel: "inputValidator", missingKey: el.type, context: el.context });

            response[el.context.key] = missingTranslation ? el.message : messageTranslated;
        });

        return response;

    }
}