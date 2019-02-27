/**
 * Get the application configuration for the supplied environment
 */
function getConfig() {
    const config = {
        OPEN_SOURCE_USAGE_TYPES: [
            "openSource"
        ],
        GOVERNMENT_WIDE_USAGE_TYPES: [
            "governmentWideReuse"
        ],
        EXEMPT_USAGE_TYPES: [
            "exemptByLaw", 
            "exemptByNationalSecurity", 
            "exemptByAgencySystem", 
            "exemptByAgencyMission", 
            "exemptByCIO", 
            "exemptByPolicyDate"
        ],
        REMOTE_METADATA_LOCATION: "https://raw.githubusercontent.com/GSA/code-gov-data/master/agency_metadata.json",
        LOCAL_METADATA_LOCATION: "./config/agency_metadata.json",
        GET_REMOTE_METADATA: true,
        INCLUDE_USAGE_TYPE_FOR_NAME_DUPS: true,
        URL_FETCH_TIMEOUT: 5000
    };

    return config;
  }
  
  module.exports = getConfig;
  