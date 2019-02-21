const fetch = require("node-fetch");
const { Writable } = require("stream");
const fs = require("fs-extra");

class AgencyJsonStream extends Writable {
    constructor(verifyURL = false) {
        super({
            objectMode: true
        });
        this.verifyURL = verifyURL;
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
        var verifyURLs = [];
        if (jsonData.releases) {
            var validOrgNameItems = [],
                orgNameDuplicates = [],
                validURLItems = [],
                urlDuplicates = [];

            var i = 0;
            jsonData.releases.forEach(function (release) {
                if (release.permissions.usageType === "openSource") {
                    verifyURLs.push({
                        "position": i,
                        "organization": release.organization,
                        "name": release.name,
                        "usageType": release.permissions.usageType,
                        "repositoryURL": release.repositoryURL
                    });
                }
                var orgNameDuplicate = false;
                var urlDuplicate = false;
                var j = 0;
                for (var validItem of validOrgNameItems) {
                    if (validItem.organization && validItem.name && release.organization === validItem.organization && release.name === validItem.name) {
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
                for (var validItem of validURLItems) {
                    if (validItem.repositoryURL && release.repositoryURL === validItem.repositoryURL) {
                        if (release.permissions.usageType !== "exemptByLaw" && release.permissions.usageType !== "governmentWideReuse") {
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
                i++;
            });
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
        return verifyURLs;
    }

    async getAgencyCodeJson(agency) {
        var urlsToVerify = [];
        console.log("Fetching code.json for --> " + agency.name + " (" + agency.acronym + ")");
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
                urlsToVerify = this.verifyAgencyJson(agency, jsonData)
            } else {
                const issues = {
                    "URL": agency.codeUrl
                }
                fs.writeFileSync("./issues/" + agency.acronym + "-fetchError.json", JSON.stringify(issues));
            }
        } catch (error) {
            const issues = {
                "URL": agency.codeUrl
            }
            fs.writeFileSync("./issues/" + agency.acronym + "-fetchError.json", JSON.stringify(issues));
        }
        return urlsToVerify;
    }

    async verifyURLs(agency, urlsToVerify, verifyURL=false) {
        if (verifyURL) {
            var unreachableURLs = [];
            for (var i = 0; i < urlsToVerify.length; i++) {
                let response;
                var reachable = true;
                try {
                    response = await fetch(urlsToVerify[i].repositoryURL, {
                        headers: {
                            "User-Agent": "code.gov"
                        },
                        timeout: 5000
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
                const issues = JSON.stringify({
                    "count": unreachableURLs.length,
                    "data": unreachableURLs
                });
                fs.writeFileSync("./issues/" + agency.acronym + "-unreachableURLs.json", issues);
            }
        }
    }

    _write(agency, enc, next) {
        // console.log("Verifying code.json for " + (this.verifyURL ? "(With URL Verification) " : "") + agency.acronym);
        this.getAgencyCodeJson(agency)
            .then(urlsToVerify => this.verifyURLs(agency, urlsToVerify, this.verifyURL));
        return next();
    }
}

module.exports = AgencyJsonStream;