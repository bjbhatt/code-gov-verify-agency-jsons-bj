const getConfig = require("./config");
const apiCalls = require("./lib/apiCalls");
const fsCalls = require("./lib/fsCalls");

class GitHubReposStats {
    constructor() {
        this.config = getConfig();    
    }

    async getGitHubReposWithStatistics() {
        console.log('Retrieving Repos...');
        let repos = await apiCalls.getRepos(this.config);

        let { GITHUB_START_FROM, GITHUB_MAX_REPOS } = this.config;
        if (!GITHUB_START_FROM) GITHUB_START_FROM = 0;
        if (!GITHUB_MAX_REPOS) GITHUB_MAX_REPOS = 50;

        console.log('Processing Repos...');
        let gitHubRegExp = new RegExp('github.com');
        let gitHubRepos = repos
            .filter((repo, i) => gitHubRegExp.test(repo.repositoryURL))
            .map((repo, i) => {
                let urlParts = repo.repositoryURL.split('/');
                let gitHubOrganization = urlParts[urlParts.length-2];
                let gitHubProject = urlParts[urlParts.length-1].replace('.git', '');
                return {
                    agency: repo.agency.acronym, 
                    organization: repo.organization ? repo.organization : '',
                    name: repo.name,
                    repositoryURL: repo.repositoryURL,
                    gitHubOrganization,
                    gitHubProject
                };
            }).sort((e1, e2) => e1.agency >= e2.agency ? 1 : -1)
            .filter((repo, index) => (index >= GITHUB_START_FROM && index < GITHUB_START_FROM+GITHUB_MAX_REPOS));
        /** can't use .forEach below when making an async call */
        for(let i=0; i < gitHubRepos.length; i++) {
            console.log(`Getting Statistics for: ${gitHubRepos[i].agency}:${gitHubRepos[i].organization}:${gitHubRepos[i].name}...`);
            gitHubRepos[i].statistics = await apiCalls.getGitHubRepoMatrix(this.config, gitHubRepos[i].gitHubOrganization, gitHubRepos[i].gitHubProject);
        }
        let output =  `<table border="1" cellspacing="0" cellpadding="1"> 
            <tr>
            <th style="text-align: left;">Agency</th>
            <th style="text-align: left;">Organization</th>
            <th style="text-align: left;">Project Name</th>
            <th style="text-align: left;">Repo URL</th>
            <th style="text-align: left;">Statistics</th>
            </tr>` + 
            gitHubRepos.map((gitHubRepo, i) => `<tr>
                <td>${gitHubRepo.agency}</td>
                <td>${gitHubRepo.organization}</td>
                <td>${gitHubRepo.name}</td>
                <td>${gitHubRepo.repositoryURL}</td>
                <td>${JSON.stringify(gitHubRepo.statistics)
                    .replace(/{/g, '')
                    .replace(/}/g, '')
                    .replace(/":/g, ': </strong>')
                    .replace(/"/g, '<strong>')
                    .replace(/,/g, ', ')
                }</td>
                </tr>`).join('') +
            `</table>`;
        fsCalls.writeToFile(`./summary/gitHubReposStats_${GITHUB_START_FROM+1}_${GITHUB_START_FROM+GITHUB_MAX_REPOS}.html`, `<h3>GitHub Repo Statistics</h3>${output}`);
    }

    async generateMatrix() {
        fsCalls.createFolder('./summary');
        await this.getGitHubReposWithStatistics();
    }
}

if (require.main === module) {
    let repoMatrix = new GitHubReposStats();
    repoMatrix.generateMatrix();
}

module.exports = GitHubReposStats;