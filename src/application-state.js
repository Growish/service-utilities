const fs        = require('fs');
const path      = require('path');
const chokidar  = require('chokidar');

class ApplicationState {

    constructor() {

        this.data = {};
        this.fileLocation = path.resolve(path.dirname(require.main.filename), 'application-state.json');
        
        
        if (!fs.existsSync(this.fileLocation)) {
            fs.writeFileSync(this.fileLocation, JSON.stringify({}));
        }
        else {
            this.load();
        }

        chokidar.watch(this.fileLocation).on('change', (event, path) => {
            this.load();
        });

    }

    get(property = '') {

        if(!property)
            return this.data;

        if(this.data.hasOwnProperty(property))
            return this.data[property];

        return null;

    }

    set(property, value = '') {

        this.data[property] = value;
        this.save();
        return true;

    }

    increment(property) {

        let value = this.get(property);

        if(value && Number.isInteger(value))
        {
            value++;
            this.set(property, value);
            return true;
        }

        this.set(property, 1);

        return true;

    }

    save() {
        fs.writeFileSync(this.fileLocation, JSON.stringify(this.data, null, 2));
        return true;
    }

    load() {
        try {
            this.data = JSON.parse(fs.readFileSync(this.fileLocation));
        }
        catch (e) {}
    }

}


module.exports = new ApplicationState();