const fetch = require("node-fetch");

module.exports = {
    async getRepos(config) {
        let repos = [];
        let start = 0;
        let size = 100;
        let { CODE_GOV_API_PATH, CODE_GOV_API_KEY } = config;
        if (CODE_GOV_API_PATH && CODE_GOV_API_KEY) {
            let getNext = true;
            while (getNext) {
                let urlWithParams = `${CODE_GOV_API_PATH}/repos?api_key=${CODE_GOV_API_KEY}&from=${start}&size=${size}`;
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

    async getStatus(config) {
        let status = {} ;
        let { CODE_GOV_API_PATH, CODE_GOV_API_KEY } = config;
        if (CODE_GOV_API_PATH && CODE_GOV_API_KEY) {
            let urlWithParams = `${CODE_GOV_API_PATH}/status.json?api_key=${CODE_GOV_API_KEY}`;
            let response = await fetch(urlWithParams, {
                headers: {
                    "Content-Type": "application/json",
                    "User-Agent": "code.gov"
                },
                timeout: 30000
            });
            let data = await response.json();
            if (data.statuses) {
                status = data;
            }
        }
        return status;
    },

    async getGitHubRepoMatrix(config, org, repo) {
        let matrix = { forks: 0, commits: 0, pullRequests: 0, issues: 0 };
        let { GITHUB_API_PATH, GITHUB_TOKEN } = config;

        if (GITHUB_API_PATH) {
            let baseURL = `${GITHUB_API_PATH}/repos/${org}/${repo}`;
            
            let headers = { "Content-Type": "application/json" };
            if (GITHUB_TOKEN) headers.Authorization= `token ${GITHUB_TOKEN}`;

            let response = await fetch(`${baseURL}/forks`, {
                headers,
                timeout: 30000
            });
            let forks = await response.json();
            matrix.forks = forks.length;

            response = await fetch(`${baseURL}/commits`, {
                headers,
                timeout: 30000
            });
            let commits = await response.json();
            matrix.commits = commits.length;

            response = await fetch(`${baseURL}/pulls`, {
                headers,
                timeout: 30000
            });
            let pulls = await response.json();
            matrix.pullRequests = pulls.length;

            response = await fetch(`${baseURL}/issues`, {
                headers,
                timeout: 30000
            });
            let issues = await response.json();
            matrix.issues = issues.length;
        }
        return matrix;
    }
};