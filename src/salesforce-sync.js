const logger = require('./logger');

const tagLabel = 'salesforceSync'

let pushFn;
let deleteFn;
let realTimeSyncActive;

let isInit = false;

module.exports.init = (_realTimeSyncActive, _pushFn = () => {}, _deleteFn = () => {}) => {

    pushFn = _pushFn;
    deleteFn = _deleteFn;
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

    schema.methods.deleteToSalesforce = async function (force = false){
        if(!isInit) {
            logger.error('Salesforce sync needs to be initialized!', {tagLabel});
            return false;
        }

        if(!realTimeSyncActive && !force)
            return false;

        try {

            return await deleteFn({assetId: this._id, assetClass: options.assetClass, hook: 'direct'});

        }
        catch (error) {

            logger.error('Push function failed', { tagLabel, error });
            return false;

        }
    }

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

    schema.pre('deleteOne', { document: false, query: true }, async function (next) {
        try {
            if(!isInit) {
                logger.error('Salesforce sync needs to be initialized!', {tagLabel});
                return next();
            }

            const filter = this.getFilter();
            const doc = await this.model.findOne(filter).lean();

            if (doc && doc._id) {
                deleteFn({assetId: doc._id, assetClass: options.assetClass, hook: 'delete one'});
            }

            next();
        } catch (e) {
            logger.error('Cannot run pre delete one hook', {tagLabel});
            next();
        }
    });

    schema.pre('deleteMany', { document: false, query: true }, async function (next) {
        try {
            if(!isInit) {
                logger.error('Salesforce sync needs to be initialized!', {tagLabel});
                return next();
            }
            const filter = this.getFilter();

            // Se vuoi ottenere gli _id effettivi prima di cancellare:
            const docs = await this.model.find(filter, { _id: 1 }).lean();

            for (let i = 0; i < docs.length; i++) {
                const doc = docs[i];
                if (doc && doc._id) {
                    deleteFn({assetId: doc._id, assetClass: options.assetClass, hook: 'delete many'});
                }
            }
        } catch (e) {
            logger.error('Cannot run pre delete many hook', {tagLabel});
            next();
        }
        next();

    });

};