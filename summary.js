const getConfig = require("./config");
const apiCalls = require("./lib/apiCalls");
const fsCalls = require("./lib/fsCalls");

class Summary {
  constructor() {
    this.config = getConfig();
  }

  typeSummary(typeCounts, filePrefix) {
    let summary = "";
    Object.keys(typeCounts).forEach((key, i) => {
      let repos = typeCounts[key].sort((r1, r2) => r1.agency.acronym > r2.agency.acronym ? 1 : r1.agency.acronym < r2.agency.acronym ? -1 : r1.name >= r2.name ? 1 : -1);
      summary += `<strong>${key}:</strong> ${repos.length}<br />`;
      fsCalls.writeToFile(
        `./summary/${filePrefix}_${key}.html`,
        `<table border="1" cellspacing="0" cellpadding="1"><tr><th style="text-align: left;">Agency</th><th style="text-align: left;">Project Name</th><th style="text-align: left;">Repository URL</th></tr>`
      );
      repos.forEach(repo => {
        fsCalls.writeToFile(
            `./summary/${filePrefix}_${key}.html`,
            `<tr><td>${repo.agency.acronym}</td><td>${repo.name}</td><td>${repo.repositoryURL}</td></tr>`,
            true
          );
        });
      fsCalls.writeToFile(
        `./summary/${filePrefix}_${key}.html`,
        `</table>`,
        true
      );
    });

    return summary;
  }

  _generateGroupHTML(statuses, caption, bgColor) {
    if (statuses && statuses.length > 0) {
      let bgColorStyle = bgColor
        ? ` style="background-color: ${bgColor};" `
        : ``;
      return (
        (caption
          ? `<tr${bgColorStyle}><td colspan="5">${caption}</td></tr>`
          : ``) +
        statuses.sort((s1, s2) => s1.agency >= s2.agency ? 1 : -1)
          .map(
            (status, i) => `<tr${bgColorStyle}>
                    <td>${status.agency}</td>
                    <td>${status.wasRemoteJsonRetrived ? "Yes" : "No"}</td>
                    <td>${status.wasRemoteJsonParsed ? "Yes" : "No"}</td>
                    <td>${status.wasFallbackUsed ? "Yes" : "No"}</td>
                    <td>${JSON.stringify(status.counts)
                      .replace(/{/g, "")
                      .replace(/}/g, "")
                      .replace(/":/g, ": </strong>")
                      .replace(/"/g, "<strong>")
                      .replace(/,/g, ", ")}</td>
                    </tr>`
          )
          .join("")
      );
    }
    return "";
  }

  async agencySummary() {
    let statuses = [];

    console.log("Retrieving status...");
    let data = await apiCalls.getStatus(this.config);
    console.log("Processing status...");
    let output = `Last Update on: ${data.timestamp}<p />`;
    if (data.statuses) {
      Object.keys(data.statuses).forEach(key => {
        statuses.push({
          agency: key,
          wasRemoteJsonRetrived: data.statuses[key].wasRemoteJsonRetrived,
          wasRemoteJsonParsed: data.statuses[key].wasRemoteJsonParsed,
          wasFallbackUsed: data.statuses[key].wasFallbackUsed,
          counts: data.statuses[key].counts
        });
      });
    }
    output += `<table border="1" cellspacing="0" cellpadding="1"> 
        <tr>
        <th style="text-align: left;">Agency</th>
        <th style="text-align: left;">Remote JSON Retrieved</th>
        <th style="text-align: left;">Remote JSON Parsed</th>
        <th style="text-align: left;">Fallback JSON Used</th>
        <th style="text-align: left;">Counts</th>
        </tr>`;
    let groupedStatuses = statuses.filter(s => !s.wasRemoteJsonRetrived && !s.wasFallbackUsed);
    output += this._generateGroupHTML(
      groupedStatuses,
      "No remote code.json file.  Missing fallback file or errors while processing fallback file.",
      "#F5A9A9"
    );
    groupedStatuses = statuses.filter(s => s.wasRemoteJsonRetrived && !s.wasRemoteJsonParsed && !s.wasFallbackUsed);
    output += this._generateGroupHTML(
      groupedStatuses,
      "Errors while processing remote code.json file.  Missing fallback file or errors while processing fallback file.",
      "#F5A9A9"
    );
    groupedStatuses = statuses.filter(s => !s.wasRemoteJsonRetrived && s.wasFallbackUsed);
    output += this._generateGroupHTML(
      groupedStatuses,
      "No remote code.json file.  Used fallback file successfully.",
      "#F2F5A9"
    );
    groupedStatuses = statuses.filter(s => s.wasRemoteJsonRetrived && !s.wasRemoteJsonParsed && s.wasFallbackUsed);
    output += this._generateGroupHTML(
      groupedStatuses,
      "Errors while processing Remote code.json file.  Used fallback file successfully.",
      "#F2F5A9"
    );
    groupedStatuses = statuses.filter(s => s.wasRemoteJsonRetrived && s.wasRemoteJsonParsed);
    output += this._generateGroupHTML(
      groupedStatuses,
      "Used remote code.json file successfully.",
      ""
    );
    output += `</table>`;
    fsCalls.writeToFile(
      `./summary/summary.html`,
      `<h3>Summary by Agency</h3>${output}`
    );
  }

  async repoSummary() {
    let sourceControlTypeCounts = {};
    let usageTypeCounts = {};
    let regExps = this.config.SOURCE_CONTROL_TYPES.map(
      (sourceControlType, i) => {
        return { sourceControlType, exp: new RegExp(sourceControlType) };
      }
    );
    let usageTypes = [
      ...this.config.OPEN_SOURCE_USAGE_TYPES,
      ...this.config.GOVERNMENT_WIDE_USAGE_TYPES,
      ...this.config.EXEMPT_USAGE_TYPES
    ];

    console.log("Retrieving Repos...");
    let repos = await apiCalls.getRepos(this.config);
    console.log("Processing Repos...");
    repos.forEach((repo, index) => {
      let sourceControlTypeMatched = "other";
      if (repo.repositoryURL) {
        regExps.forEach((regExp, index) => {
          if (regExp.exp.test(repo.repositoryURL)) {
            sourceControlTypeMatched = regExp.sourceControlType;
          }
        });
      }
      if (!sourceControlTypeCounts[sourceControlTypeMatched]) sourceControlTypeCounts[sourceControlTypeMatched] = [];
      sourceControlTypeCounts[sourceControlTypeMatched].push(repo);

      let usageTypeMatched = "other";
      if (repo.permissions && repo.permissions.usageType) {
        usageTypes.forEach((usageType, index) => {
          if (repo.permissions.usageType === usageType) {
            usageTypeMatched = usageType;
          }
        });
      }
      if (!usageTypeCounts[usageTypeMatched]) usageTypeCounts[usageTypeMatched] = [];
      usageTypeCounts[usageTypeMatched].push(repo);
    });
    fsCalls.writeToFile(
      `./summary/summary.html`,
      `<hr /><h3>Summary By Source Control</h3>${this.typeSummary(
        sourceControlTypeCounts, 'SourceControl'
      )}`,
      true
    );
    fsCalls.writeToFile(
      `./summary/summary.html`,
      `<hr /><h3>Summary By Usage Type</h3>${this.typeSummary(
        usageTypeCounts, 'UsageType'
      )}`,
      true
    );
  }

  async generateSummary() {
    fsCalls.createFolder("./summary");
    await this.agencySummary();
    await this.repoSummary();
  }
}

if (require.main === module) {
  let summary = new Summary();
  summary.generateSummary();
}

module.exports = Summary;
