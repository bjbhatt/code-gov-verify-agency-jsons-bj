# code-gov-verify-agency-jsons
This a utility project, used in conjustion with code-gov-harvester, can help you find various statistics of Repositories imported into code.gov system.

## Requirements
1. NPM version 6.x.x or higher
2. NodeJS version 8.x.x or higher

## Installation
1. Verifying/install NPM and NodeJS
2. Clone the repo
3. Run `npm install` to install dependencies.

## Configuration
Configuration variables are stored in [./config/index.js](./config/index.js) file; following are details:
1. `OPEN_SOURCE_USAGE_TYPES` - array of strings defining open-source Usage Type (e.g. ['openSource'])
2. `GOVERNMENT_WIDE_USAGE_TYPES` - array of strings defining government-wide-reuse Usage Type (e.g. ['govenrmentWideReuse'])
3. `EXEMPT_USAGE_TYPES` - array of strings defining exempt Usage Type (e.g. ['exemptByLaw', 
            'exemptByNationalSecurity', ...])
4. `SOURCE_CONTROL_TYPES` - array of partial string that is part of the repository URL that can help identify different Source Control System (e.g. ['github', 'bitbucket', ...])
5. `REMOTE_METADATA_LOCATION` - path to remote agency_metadata.json file (e.g. "https://raw.githubusercontent.com/GSA/code-gov-data/master/agency_metadata.json")
6. `LOCAL_METADATA_LOCATION` - path to local agency_metadata.json file (e.g. "./config/agency_metadata.json")
7. `GET_REMOTE_METADATA` - true/false indicating user remote or local metadata file
8. `INCLUDE_USAGE_TYPE_FOR_NAME_DUPS` - true/false indicating whether include/exclude Usage Type when looking for duplicates
9. `URL_FETCH_TIMEOUT` - timeout in milliseconds when fetching exeternal URL
10. `CODE_GOV_API_PATH` - path to api.code.gov (e.g. "https://api.code.gov")
11. `CODE_GOV_API_KEY` - api key to use when connecting to api.code.gov
12. `GITHUB_API_PATH` - path to github api (e.g. "https://api.github.com")
13. `GITHUB_TOKEN` - auth token to use when making GitHub Api calls
14. `GITHUB_START_FROM` - repo # to start from (zero-based) when pulling GitHub Stats (Forks, Issues, Commits, PRs)
15. `GITHUB_MAX_REPOS` - max repos when pulling GitHub Stats (Forks, Issues, Commits, PRs)

## Options to run
1. `npm run start` - this option gets all code.json files from agencies and identifies issues related to duplicate project names, duplicate project URL, repos with no Releases section and code.json file not available.  The issues identified are added (or overwritten for subsequent runs) as files in the issues folder
2. `npm run start-verify-url` - in addtion to doing what `npm run start` does, it also verify's whether repository URL is reachable or not, specifically for openSource repositories.
3. `npm run summary` - this options gives you Summary by Agency, Summary by Source Control and Summary by Usage Type by generating a summary.html file in ./summary folder.  In addition it also gives you Details by Source Control by generating SourceControl_xxxxx.html file in ./summary folder and Details by Usage Type by generating UsageType_xxxxx.html file in ./summary folder.  To set a list of Source Control and Usage types update `SOURCE_CONTROL_TYPES` and `OPEN_SOURCE_USAGE_TYPES`, `GOVERNMENT_WIDE_USAGE_TYPES` and `EXEMPT_USAGE_TYPES` respectively in configuration file [./config/index.js](./config/index.js)
4. `npm run github-repos-stats` - this option generates statistics for each and every GitHub Repos harvested into Code.gov.  The statistics include #forks, #commits, #issues and #pull_requests.
