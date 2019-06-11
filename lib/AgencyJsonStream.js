const fetch = require("node-fetch");
const { Writable } = require("stream");
const fsCalls = require("./fsCalls");

class AgencyJsonStream extends Writable {
    constructor(config, verifyURL = false) {
        super({
            objectMode: true
        });
        this.verifyURL = verifyURL;
        this.config = config;
    }

    stripBom(input) {
        const inputString = input.toString();

        if (inputString.charCodeAt(0) === 0xFEFF) {
            return inputString.slice(1);
        }
        return inputString;
    }

    verifyAgencyJson(agency, codeJson, config) {
        fsCalls.writeToFile(`./fetchData/${agency.acronym}.json`, JSON.stringify(codeJson));
        if (!codeJson.releases) {
            const issues = { 
                "error": "code.json file does not contain Releases entry"
            };
            fsCalls.writeToFile(`./issues/${agency.acronym}-noReleases.json`, JSON.stringify(issues));
            return [];
        }

        let verifyURLs = [],
            validOrgNameItems = [],
            orgNameDuplicates = [],
            validURLItems = [],
            urlDuplicates = [];

        codeJson.releases.forEach( (release, i) => {
            if (config.OPEN_SOURCE_USAGE_TYPES.indexOf(release.permissions.usageType) !== -1) {
                verifyURLs.push({
                    "position": i,
                    "organization": release.organization,
                    "name": release.name,
                    "usageType": release.permissions.usageType,
                    "repositoryURL": release.repositoryURL
                });
            }
            let orgNameDuplicate = false;
            let j = 0;
            for (let validItem of validOrgNameItems) {
                if (validItem.organization && 
                    validItem.name && 
                    release.organization === validItem.organization && 
                    release.name === validItem.name &&
                    (!config.INCLUDE_USAGE_TYPE_FOR_NAME_DUPS || release.permissions.usageType === validItem.usageType)) {
                    orgNameDuplicate = true;
                    orgNameDuplicates.push({
                        "position": i,
                        "organization": release.organization,
                        "name": release.name,
                        "usageType": release.permissions.usageType,
                        "repositoryURL": release.repositoryURL,
                        "orgNameDuplicateOf": {
                            "position": j,
                            "organization": validItem.organization,
                            "name": validItem.name,
                            "usageType": validItem.usageType,
                            "repositoryURL": validItem.repositoryURL
                        }
                    });
                    break;
                }
                j++;
            }
            if (orgNameDuplicate) {
                validOrgNameItems.push({});
            } else {
                validOrgNameItems.push({
                    "organization": release.organization,
                    "name": release.name,
                    "usageType": release.permissions.usageType,
                    "repositoryURL": release.repositoryURL
                });
            }
            j = 0;
            let urlDuplicate = false;
            for (let validItem of validURLItems) {
                if (validItem.repositoryURL && release.repositoryURL === validItem.repositoryURL) {
                    if (config.OPEN_SOURCE_USAGE_TYPES.indexOf(release.permissions.usageType) !== -1 && 
                        config.OPEN_SOURCE_USAGE_TYPES.indexOf(validItem.usageType) != -1) {
                        urlDuplicate = true;
                        urlDuplicates.push({
                            "position": i,
                            "organization": release.organization,
                            "name": release.name,
                            "usageType": release.permissions.usageType,
                            "repositoryURL": release.repositoryURL,
                            "urlDuplicateOf": {
                                "position": j,
                                "organization": validItem.organization,
                                "name": validItem.name,
                                "usageType": validItem.usageType,
                                "repositoryURL": validItem.repositoryURL,
                            }
                        })
                        break;
                    }
                }
                j++;
            }
            if (urlDuplicate) {
                validURLItems.push({});
            } else {
                validURLItems.push({
                    "organization": release.organization,
                    "name": release.name,
                    "usageType": release.permissions.usageType,
                    "repositoryURL": release.repositoryURL
                });
            }
        });
        if (orgNameDuplicates.length > 0) {
            const issues = {
                "count": orgNameDuplicates.length,
                "data": orgNameDuplicates
            };
            fsCalls.writeToFile(`./issues/${agency.acronym}-duplicateName.json`, JSON.stringify(issues));
        }
        if (urlDuplicates.length > 0) {
            const issues = {
                "count": urlDuplicates.length,
                "data": urlDuplicates
            };
            fsCalls.writeToFile(`./issues/${agency.acronym}-duplicateURL.json`, JSON.stringify(issues));
        }
        return verifyURLs;
    }

    async getAgencyCodeJson(agency) {
        let urlsToVerify = [];
        console.log(`Fetching code.json for --> ${agency.name} (${agency.acronym})`);
        let response;
        try {
            response = await fetch(agency.codeUrl, {
                headers: {
                    "Content-Type": "application/json",
                    "User-Agent": "code.gov"
                },
                timeout: 30000
            });
            if (response && (response.status >= 200 && response.status < 300)) {
                const responseBuffer = await response.buffer();
                const jsonData = JSON.parse(this.stripBom(responseBuffer));
                urlsToVerify = this.verifyAgencyJson(agency, jsonData, this.config);
            } else {
                const issues = {
                    "URL": agency.codeUrl
                };
                fsCalls.writeToFile(`./issues/${agency.acronym}-fetchError.json`, JSON.stringify(issues));
            }
        } catch (error) {
            const issues = {
                "URL": agency.codeUrl
            };
            fsCalls.writeToFile(`./issues/${agency.acronym}-fetchError.json`, JSON.stringify(issues));
        }
        return urlsToVerify;
    }

    async verifyURLs(agency, urlsToVerify, urlFetchTimeout=5000) {
        if (!urlsToVerify || urlsToVerify.length === 0) {
            return;
        }
        let unreachableURLs = [];
        for (let i = 0; i < urlsToVerify.length; i++) {
            let response;
            let reachable = true;
            try {
                response = await fetch(urlsToVerify[i].repositoryURL, {
                    headers: {
                        "User-Agent": "code.gov"
                    },
                    timeout: urlFetchTimeout
                });
                if (!(response && (response.status >= 200 && response.status < 300))) {
                    reachable = false;
                }
            } catch (error) {
                reachable = false;
            }
            if (!reachable) {
                unreachableURLs.push(urlsToVerify[i]);
            }
        }
        if (unreachableURLs.length > 0) {
            const issues = {
                "count": unreachableURLs.length,
                "data": unreachableURLs
            };
            fsCalls.writeToFile(`./issues/${agency.acronym}-unreachableURLs.json`, JSON.stringify(issues));
        }
    }

    _write(agency, enc, next) {
        this.getAgencyCodeJson(agency)
            .then(urlsToVerify => this.verifyURLs(agency, this.verifyURL ? urlsToVerify : [], this.config.URL_FETCH_TIMEOUT));
        return next();
    }
}

module.exports = AgencyJsonStream;