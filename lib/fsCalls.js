const fs = require("fs-extra");

module.exports = {
    createFolder(foldername, dropAndCreateIfExists=false) {
        if (!fs.existsSync(foldername)) {
            fs.mkdirSync(foldername);
        } else if (dropAndCreateIfExists) {
            fs.removeSync(foldername);
            fs.mkdirSync(foldername);
        }
    },

    writeToFile(filename, data, appendIfExists=false) {
        if (appendIfExists) {
            fs.appendFileSync(filename, data);
        } else {
            fs.writeFileSync(filename, data)
        }
    },

    createReadStream(filename) {
        return fs.createReadStream(filename);
    }
};