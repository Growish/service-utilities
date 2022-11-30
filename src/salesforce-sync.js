const logger = require('./logger');

const tagLabel = 'salesforceSync'

let pushFn;
let realTimeSyncActive;

let isInit = false;

module.exports.init = (_realTimeSyncActive, _pushFn = () => {}) => {

    pushFn = _pushFn;
    realTimeSyncActive = _realTimeSyncActive;
    isInit = true;

}

module.exports.mongoosePlugin = (schema, options = {}) => {

    schema.pre('save', function (next) {

        try {

            if(!isInit) {
                logger.error('Salesforce sync needs to be initialized!', {tagLabel});
                return next();
            }

            if (!realTimeSyncActive)
                return next();

            if(options.ignorePushOnSave)
                return next();

            const _self = this;
            pushFn({assetId: _self._id, assetClass: options.assetClass, hook: 'save'});
            next();
        }
        catch (e) {
            logger.error('Cannot run pre save hook', {tagLabel});
            next();
        }

    });


    schema.methods.pushToSalesforce = async function (force = false) {

        if(!isInit) {
            logger.error('Salesforce sync needs to be initialized!', {tagLabel});
            return false;
        }

        if(!realTimeSyncActive && !force)
            return false;

        try {

            return await pushFn({assetId: this._id, assetClass: options.assetClass, hook: 'direct'});

        }
        catch (error) {

            logger.error('Push function failed', { tagLabel, error });
            return false;

        }
    }

};