const axios = require('axios');
const logger = require('./logger');

const tagLabel = "notifier";

let ENV, SLACK_BOT_HOOK;

let isInit = false;

const init = (_env, _SLACK_BOT_HOOK) => {

    ENV = _env;
    SLACK_BOT_HOOK = _SLACK_BOT_HOOK;

    isInit = true;
};

const send = function (text, attachment, level = 'low', channel = 'slack') {

    if(!isInit)
        return logger.error('Notifier needs to be initialized!', { tagLabel });

    const payload = {
        username: 'GW(' + ENV + ')',
        mrkdwn: true,
        text
    };

    if(attachment) {
        payload.attachments = [{
            title: "Attachment",
            text: '```' + JSON.stringify(attachment, null, 2) + '```',
            mrkdwn_in: true,
            color: level === 'low' ? '#7CD197' : level === 'medium' ? '#d1b42a' : '#d1401c'
        }];
    }

    axios
        .post(SLACK_BOT_HOOK, payload).then(() => {
        logger.info("Notification to admin sent", {text, tagLabel});
    })
        .catch(error => {
            console.log(error);
            logger.info("Cannot send notification to admin", {error, text, tagLabel});
        });
};

module.exports = { init, send };