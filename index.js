const fetch = require("node-fetch");
const JSONStream = require("JSONStream");
const fs = require("fs-extra");
const AgencyJsonStream = require("./lib/AgencyJsonStream");

class Verifier {
    constructor() {
        this.REMOTE_METADATA_LOCATION = "https://raw.githubusercontent.com/GSA/code-gov-data/master/agency_metadata.json";
    }
    async getMetadata() {
        let response;
        console.log("Fetching master agency metadata...")
        response = await fetch(this.REMOTE_METADATA_LOCATION, {
            headers: {
                "Content-Type": "application/json",
                "User-Agent": "code.gov"
            },
            timeout: 30000
        });
        return response.body;
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
        const agencyEndpointsStream = await this.getMetadata();
        const jsonStream = JSONStream.parse("*");
        const agencyJsonStream = new AgencyJsonStream(verifyURL);
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