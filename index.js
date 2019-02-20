const fetch = require("node-fetch");
const { Writable } = require("stream");
const JSONStream = require("JSONStream");
const fs = require("fs-extra");

class AgencyJsonStream extends Writable {
    constructor() {
        super({
            objectMode: true
        });
    }

    stripBom(input) {
        const inputString = input.toString();

        if (inputString.charCodeAt(0) === 0xFEFF) {
            return inputString.slice(1);
        }
        return inputString;
    }

    verifyAgencyJson(agency, jsonData) {
        fs.writeFileSync("./fetchData/" + agency.acronym + ".json", JSON.stringify(jsonData));
        if (jsonData.releases) {
            var releases = jsonData.releases;
            var i = 0,
                names = [],
                orgNameDuplicates = [],
                urlDuplicates = [];
            for (i = 0; i < releases.length; i++) {
                var orgNameDuplicate = false;
                var j = 0;
                for (j = 0; j < names.length; j++) {
                    if (names[j].organization && names[j].name && releases[i].organization === names[j].organization && releases[i].name === names[j].name) {
                        orgNameDuplicate = true;
                        break;
                    }
                }
                if (orgNameDuplicate) {
                    names.push({});
                    orgNameDuplicates.push({
                        "position": i,
                        "organization": releases[i].organization,
                        "name": releases[i].name,
                        "usageType": releases[i].permissions.usageType,
                        "repositoryURL": releases[i].repositoryURL,
                        "orgNameDuplicateOf": {
                            "position": j,
                            "organization": names[j].organization,
                            "name": names[j].name,
                            "repositoryURL": names[j].repositoryURL,
                            "usageType": names[j].usageType
                        }
                    })
                } else {
                    names.push({
                        "location": i,
                        "organization": releases[i].organization,
                        "name": releases[i].name,
                        "organization": releases[i].organization,
                        "usageType": releases[i].permissions.usageType,
                        "repositoryURL": releases[i].repositoryURL
                    });
                }
            }
            names = [];
            for (i = 0; i < releases.length; i++) {
                var urlDuplicate = false;
                var j = 0;
                for (j = 0; j < names.length; j++) {
                    if (names[j].repositoryURL && releases[i].repositoryURL === names[j].repositoryURL) {
                        urlDuplicate = true;
                        break;
                    }
                }
                if (urlDuplicate) {
                    names.push({});
                    urlDuplicates.push({
                        "position": i,
                        "repositoryURL": releases[i].repositoryURL,
                        "urlDuplicateOf": {
                            "position": j,
                            "usageType": names[i].usageType
                        }
                    })
                } else {
                    names.push({
                        "location": i,
                        "repositoryURL": releases[i].repositoryURL,
                        "usageType": releases[i].usageType
                    });
                }
            }
            if (orgNameDuplicates.length > 0) {
                const issues = JSON.stringify({
                    "count": orgNameDuplicates.length,
                    "data": orgNameDuplicates
                });
                fs.writeFileSync("./issues/" + agency.acronym + "-duplicateName.json", issues);
            }
            if (urlDuplicates.length > 0) {
                const issues = JSON.stringify({
                    "count": urlDuplicates.length,
                    "data": urlDuplicates
                });
                fs.writeFileSync("./issues/" + agency.acronym + "-duplicateURL.json", issues);
            }
        } else {
            const issues = "{ \"Error\": \"code.json file does not contain Releases entry\"}"
            fs.writeFileSync("./issues/" + agency.acronym + "-noReleases.json", issues);
        }
    }

    async _getAgencyCodeJson(agency) {
        console.log("Fetching code.json for --> " + agency.name + " (" + agency.acronym + ")");
        let response;
        try {
            response = await fetch(agency.codeUrl, {
                headers: {
                    "Content-Type": "application/json",
                    "User-Agent": "code.gov"
                },
                timeout: 180000
            });
            if (response && (response.status >= 200 && response.status < 300)) {
                const responseBuffer = await response.buffer();
                const jsonData = JSON.parse(this.stripBom(responseBuffer));
                this.verifyAgencyJson(agency, jsonData);
            } else {
                const issues = {
                    "URL" : agency.codeUrl
                }
                fs.writeFileSync("./issues/" + agency.acronym + "-fetchError.json", JSON.stringify(issues));
            }
        } catch (error) {
            const issues = {
                "URL" : agency.codeUrl
            }
            fs.writeFileSync("./issues/" + agency.acronym + "-fetchError.json", JSON.stringify(issues));
        }
    }

    _write(agency, enc, next) {
        this._getAgencyCodeJson(agency);
        return next();
    }
}

class Verifier {
    constructor() {
        this.REMOTE_METADATA_LOCATION = "https://raw.githubusercontent.com/GSA/code-gov-data/master/agency_metadata.json";
    }
    async getMetadata() {
        let response;
        response = await fetch(this.REMOTE_METADATA_LOCATION);
        return response.body;
    }
    async getAgencyEndPointsFile() {
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
        const agencyJsonStream = new AgencyJsonStream();
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
    let verifier = new Verifier();
    verifier.getAgencyEndPointsFile();
}

module.exports = Verifier;