const getConfig = require("./config");
const apiCalls = require("./lib/apiCalls");
const fsCalls = require("./lib/fsCalls");

class Summary {
    constructor() {
        this.config = getConfig();    
    }
    
    typeSummary(typeCounts) {
        let summary = "";
        Object.keys(typeCounts).forEach((key, i) => {
            summary +=  `<strong>${key}:</strong> ${typeCounts[key]}<br />`;
        });
        return summary;
    }

    async agencySummary() {
        let agenciesStatuses = [];

        console.log('Retrieving status...');
        let data = await apiCalls.getStatus(this.config);
        console.log('Processing status...');
        if (data.statuses) {
            Object.keys(data.statuses).forEach(key => {
                agenciesStatuses.push({
                    agency: key,
                    wasFallbackUsed: data.statuses[key].wasFallbackUsed,
                    wasRemoteJsonRetrived: data.statuses[key].wasRemoteJsonRetrived,
                    wasRemoteJsonParsed: data.statuses[key].wasRemoteJsonParsed,
                    counts: data.statuses[key].counts
                });
            });
        }

        let output =  `<table border="1" cellspacing="0" cellpadding="1"> 
            <tr>
            <th style="text-align: left;">Agency</th>
            <th style="text-align: left;">Remote JSON Retrieved</th>
            <th style="text-align: left;">Remote JSON Parsed</th>
            <th style="text-align: left;">Fallback JSON Used</th>
            <th style="text-align: left;">Counts</th>
            </tr>` + 
            agenciesStatuses.map((agencyStatus, i) => `<tr>
                <td>${agencyStatus.agency}</td>
                <td>${agencyStatus.wasRemoteJsonRetrived ? 'Yes' : "No"}</td>
                <td>${agencyStatus.wasRemoteJsonParsed ? 'Yes' : "No"}</td>
                <td>${agencyStatus.wasFallbackUsed ? 'Yes' : "No"}</td>
                <td>${JSON.stringify(agencyStatus.counts)
                    .replace(/{/g, '')
                    .replace(/}/g, '')
                    .replace(/":/g, ': </strong>')
                    .replace(/"/g, '<strong>')
                    .replace(/,/g, ', ')
                }</td>
                </tr>`).join('') +
            `</table>`;
        fsCalls.writeToFile(`./summary/summary.html`, `<h3>Summary by Agency</h3>${output}`);
    }

    async repoSummary() {
        let sourceControlTypeCounts = { };
        let usageTypeCounts = { };
        let regExps = this.config.SOURCE_CONTROL_TYPES.map((sourceControlType, i) => { return { sourceControlType, exp: new RegExp(sourceControlType) } });
        let usageTypes = [...this.config.OPEN_SOURCE_USAGE_TYPES, ...this.config.GOVERNMENT_WIDE_USAGE_TYPES, ...this.config.EXEMPT_USAGE_TYPES];

        console.log('Retrieving Repos...');
        let repos = await apiCalls.getRepos(this.config);
        console.log('Processing Repos...');
        repos.forEach( (repo, index) => {
            let sourceControlTypeMatched = 'other';
            if (repo.repositoryURL) {
                regExps.forEach((regExp, index) => {
                    if (regExp.exp.test(repo.repositoryURL)) {
                        sourceControlTypeMatched = regExp.sourceControlType;
                    }
                });
            }
            sourceControlTypeCounts[sourceControlTypeMatched] = sourceControlTypeCounts[sourceControlTypeMatched] ? sourceControlTypeCounts[sourceControlTypeMatched] + 1 : 1;

            let usageTypeMatched = 'other';
            if (repo.permissions && repo.permissions.usageType) {
                usageTypes.forEach((usageType, index) => {
                    if (repo.permissions.usageType === usageType) {
                        usageTypeMatched = usageType;
                    }
                });
            }
            usageTypeCounts[usageTypeMatched] = usageTypeCounts[usageTypeMatched] ? usageTypeCounts[usageTypeMatched] + 1 : 1;

        });
        fsCalls.writeToFile(`./summary/summary.html`, `<hr /><h3>Summary By Source Control</h3>${this.typeSummary(sourceControlTypeCounts)}`, true);
        fsCalls.writeToFile(`./summary/summary.html`, `<hr /><h3>Summary By Usage Type</h3>${this.typeSummary(usageTypeCounts)}`, true);
    }

    async generateSummary() {
        fsCalls.createFolder('./summary');
        await this.agencySummary();
        await this.repoSummary();
    }
}

if (require.main === module) {
    let summary = new Summary();
    summary.generateSummary();
}

module.exports = Summary;