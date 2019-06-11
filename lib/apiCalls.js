const fetch = require("node-fetch");

module.exports = {
    async getRepos(config) {
        let repos = [];
        let start = 0;
        let size = 100;
        if (config && config.CODE_GOV_API_PATH && config.CODE_GOV_API_KEY) {
            let getNext = true;
            while (getNext) {
                let urlWithParams = config.CODE_GOV_API_PATH + "/repos?api_key=" + config.CODE_GOV_API_KEY + "&from=" + start + "&size=" + size;
                //console.log(urlWithParams);
                let response = await fetch(urlWithParams, {
                    headers: {
                        "Content-Type": "application/json",
                        "User-Agent": "code.gov"
                    },
                    timeout: 30000
                });
                let data = await response.json();
                if (data.repos) {
                    repos = [...repos, ...data.repos];
                    start += size;
                    getNext = data.repos.length === size;
                } else {
                    getNext = false;
                }
            }
        }
        return repos;
    },

    async getAgenciesStatus(config) {
        let statuses = [];
        if (config && config.CODE_GOV_API_PATH && config.CODE_GOV_API_KEY) {
            let urlWithParams = config.CODE_GOV_API_PATH + "/status.json?api_key=" + config.CODE_GOV_API_KEY;
            let response = await fetch(urlWithParams, {
                headers: {
                    "Content-Type": "application/json",
                    "User-Agent": "code.gov"
                },
                timeout: 30000
            });
            let data = await response.json();
            if (data.statuses) {
                Object.keys(data.statuses).forEach(key => {
                    statuses.push({
                        agency: key,
                        wasFallbackUsed: data.statuses[key].wasFallbackUsed,
                        wasRemoteJsonRetrived: data.statuses[key].wasRemoteJsonRetrived,
                        wasRemoteJsonParsed: data.statuses[key].wasRemoteJsonParsed,
                        counts: data.statuses[key].counts
                    });
                });
            }
        }
        return statuses.sort((r1, r2) => (r1.agency > r2.agency) ? 1 : -1);
    }
};