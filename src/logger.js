const appRoot                               = require('app-root-path').path;
const { createLogger, format, transports }  = require('winston');
const { combine, timestamp, printf }        = format;
const process                               = require('process');
const chalkModule                           = require('chalk');
const chalk                                 = chalkModule.default || chalkModule;

require('winston-daily-rotate-file');

const loggerMode                       = (process.env.LOGGER_MODE || 'legacy').toLowerCase();
const isCloudMode                      = loggerMode === 'cloud';
const serviceName                      = process.env.APP_NAME || process.env.SERVICE_NAME || null;
const serviceEnv                       = process.env.ENVIRONMENT || process.env.ENV || null;
const serviceVersion                   = process.env.APP_VERSION || "0.0.1";

const parseBoolean = (value, defaultValue) => {
    if(value === undefined)
        return defaultValue;

    return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
};

const fileEnabled                           = parseBoolean(process.env.LOGGER_FILE_ENABLED, !isCloudMode);
const consoleEnabled                        = parseBoolean(process.env.LOGGER_CONSOLE_ENABLED, true);
const consoleJsonEnabled                    = parseBoolean(process.env.LOGGER_CONSOLE_JSON, isCloudMode);

function censor(censor) {
    let i = 0;

    return function(key, value) {
        if(i !== 0 && typeof(censor) === 'object' && typeof(value) == 'object' && censor == value)
            return '[Circular]';

        if(i >= 29)
            return '[Unknown]';

        ++i;

        return value;
    }
}

const extractRelevant = (info) => {

    if(typeof info !== 'object')
        return info;

    let obj = {};

    for (let key in info) {
        if (info.hasOwnProperty(key)) {
            if(key === 'error') {

                if(info[key] instanceof Error) {
                    obj[key] = typeof info[key] === 'object' ? JSON.stringify(info[key], Object.getOwnPropertyNames(info[key])) : info[key];
                } else
                    obj[key] = info[key];

            }
            else if(key !== 'level' && key !== 'message' && key !== 'timestamp' && key !== 'tagLabel')
                obj[key] = info[key];
        }
    }

    if(Object.keys(obj).length === 0)
        return "";

    return JSON.stringify(obj, censor(obj));
};

const extractRelevantObject = (info) => {

    if(typeof info !== 'object')
        return info;

    let obj = {};

    for (let key in info) {
        if (info.hasOwnProperty(key)) {
            if(key === 'error') {

                if(info[key] instanceof Error) {
                    obj[key] = {};

                    Object.getOwnPropertyNames(info[key]).forEach((property) => {
                        obj[key][property] = info[key][property];
                    });
                } else
                    obj[key] = info[key];

            }
            else if(key !== 'level' && key !== 'message' && key !== 'timestamp' && key !== 'tagLabel')
                obj[key] = info[key];
        }
    }

    return obj;
};

const buildCloudLog = (info, extra) => {
    const payload = extractRelevantObject(info);
    const error = payload.error;

    if(error !== undefined)
        delete payload.error;

    const log = {
        timestamp: info.timestamp,
        level: info.level,
        service: serviceName,
        env: serviceEnv,
        version: serviceVersion,
        process: process.title,
        pid: process.pid,
        tagLabel: info.tagLabel || null,
        message: info.message,
        ...extra
    };

    if(Object.keys(payload).length > 0)
        log.payload = payload;

    if(error !== undefined)
        log.error = error;

    return log;
};

const cFormat = printf(info => {

    let level = (info.level === 'debug') ?
        chalk.yellow((info.level).toUpperCase()) :
        info.level === 'info' ?
            chalk.green((info.level).toUpperCase()) :
            info.level === 'error' ?
                chalk.red((info.level).toUpperCase()) :
                chalk.magenta((info.level).toUpperCase());

    if(info.tagLabel)
        level += " - " + info.tagLabel;

    if(typeof info.message === 'object')
        info.message = JSON.stringify(info.message);

    return info.timestamp + " " + chalk.blue(process.title) + `(${process.pid}) [` + level + `] : ${info.message}` + "  " + extractRelevant(info);
});

const fFormat = printf(info => {
    return JSON.stringify({ process: process.title, pid: process.pid, level: info.level, tagLabel: info.tagLabel || null, timestamp: info.timestamp, message: info.message, payload: extractRelevant(info) });
});

const jsonConsoleFormat = printf(info => {
    return JSON.stringify(buildCloudLog(info), censor(info));
});

const httpFormat = printf(info => {
    return JSON.stringify(buildCloudLog(info, { type: 'http', message: String(info.message || '').trim() }), censor(info));
});

const options = {

    fileInfo: {
        level: 'info',
        handleExceptions: true,
        json: true,
        filename: `${appRoot}/logs/app-%DATE%.log`,
        datePattern: 'YYYY-MM-DD',
        zippedArchive: false,
        maxSize: '20m',
        maxFiles: '14d',
        format: combine( timestamp(), format.splat(), format.simple(), fFormat )
    },

    fileHttp: {
        level: 'info',
        filename: `${appRoot}/logs/http-%DATE%.log`,
        handleExceptions: true,
        datePattern: 'YYYY-MM-DD',
        zippedArchive: false,
        maxSize: '20m',
        maxFiles: '14d',
        format: combine(format.json())
    },

    fileError: {
        level: 'error',
        filename: `${appRoot}/logs/error-%DATE%.log`,
        handleExceptions: true,
        json: true,
        datePattern: 'YYYY-MM-DD',
        zippedArchive: false,
        maxSize: '20m',
        maxFiles: '14d',
        format: combine( timestamp(), format.splat(), format.simple(), fFormat )
    },

    console: {
        level: 'debug',
        handleExceptions: true,
        json: false,
        stderrLevels: ['error'],
        format: combine( timestamp(), format.splat(), format.simple(), consoleJsonEnabled ? jsonConsoleFormat : cFormat )
    },

    consoleHttp: {
        level: 'info',
        handleExceptions: true,
        json: consoleJsonEnabled,
        stderrLevels: ['error'],
        format: combine( timestamp(), consoleJsonEnabled ? httpFormat : format.simple() )
    }
};

const mainTransports = [];
const httpTransports = [];

if(fileEnabled) {
    mainTransports.push(new transports.DailyRotateFile(options.fileInfo));
    mainTransports.push(new transports.DailyRotateFile(options.fileError));
    httpTransports.push(new transports.DailyRotateFile(options.fileHttp));
}

if(consoleEnabled) {
    mainTransports.push(new transports.Console(options.console));
    httpTransports.push(new transports.Console(options.consoleHttp));
}

let logger = createLogger({
    transports: mainTransports,
    exitOnError: false
});

let expressLogger = createLogger({
    transports: httpTransports
});

logger.stream = {
    write: function(message, encoding) {
        expressLogger.info(message);
    },
};

logger.genTag = (name) => {
    return name + ' (' + Math.random().toString(36).substring(8) + ')'
};

logger.config = {
    mode: loggerMode,
    fileEnabled,
    consoleEnabled,
    consoleJsonEnabled,
    serviceName,
    serviceEnv,
    serviceVersion
};

module.exports = logger;
