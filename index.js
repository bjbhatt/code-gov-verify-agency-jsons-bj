const fetch = require("node-fetch");
const JSONStream = require("JSONStream");
const fs = require("fs-extra");
const AgencyJsonStream = require("./lib/AgencyJsonStream");
const getConfig = require("./config");

class Verifier {
    constructor() {
        this.config = getConfig();    
    }
    
    async getMetadata(config) {
        let response;
        if (config && config.GET_REMOTE_METADATA) {
            console.log("Fetching remote metadata for agencies...");
            response = await fetch(config.REMOTE_METADATA_LOCATION, {
                headers: {
                    "Content-Type": "application/json",
                    "User-Agent": "code.gov"
                },
                timeout: 30000
            });
            return response.body;
        }

        console.log("Using local metadata for agencies...");
        return fs.createReadStream(config.LOCAL_METADATA_LOCATION);
    }

    async getAgencyEndPointsFile(verifyURL=false) {
        if (fs.existsSync("./issues")) {
            fs.removeSync("./issues");
        }
        fs.mkdirSync("./issues");
        if (fs.existsSync("./fetchData")) {
            fs.removeSync("./fetchData");
        }
        fs.mkdirSync("./fetchData");
        const agencyEndpointsStream = await this.getMetadata(this.config);
        const jsonStream = JSONStream.parse("*");
        const agencyJsonStream = new AgencyJsonStream(this.config, verifyURL);
        return new Promise((fulfill, reject) => {
            agencyEndpointsStream
                .pipe(jsonStream)
                .on("error", (error) => {
                    console.log(error);
                    reject(error);
                })
                .pipe(agencyJsonStream)
                .on("error", (error) => {
                    console.log(error);
                    reject(error);
                })
                .on("finish", () => {
                    fulfill("done");
                })
        });
    }
}

if (require.main === module) {
    var verifyURL = (process.argv.length > 2 && process.argv[2].toLowerCase() === "true");
    let verifier = new Verifier();
    verifier.getAgencyEndPointsFile(verifyURL);
}

module.exports = Verifier;