/**
 * Configuration for UK Storm Overflow Monitoring Bot
 *
 * This config contains all the ArcGIS FeatureServer endpoints for UK water companies
 * that provide near real-time CSO (Combined Sewer Overflow) and EDM (Event Duration Monitoring) data.
 *
 * All data is licensed under CC BY 4.0 and sourced from Water UK's National Storm Overflow Hub.
 */

export const WATER_COMPANIES = {
  anglian_water: {
    name: "Anglian Water",
    endpoint: "https://services3.arcgis.com/VCOY1atHWVcDlvlJ/arcgis/rest/services/stream_service_outfall_locations_view/FeatureServer",
    updateFrequencyMinutes: 60,
    layerId: 0
  },
  thames_water: {
    name: "Thames Water",
    endpoint: "https://services2.arcgis.com/g6o32ZDQ33GpCIu3/arcgis/rest/services/Thames_Water_Storm_Overflow_Activity_(Production)_view/FeatureServer",
    updateFrequencyMinutes: 5,
    layerId: 0
  },
  united_utilities: {
    name: "United Utilities",
    endpoint: "https://services5.arcgis.com/5eoLvR0f8HKb7HWP/arcgis/rest/services/United_Utilities_Storm_Overflow_Activity/FeatureServer",
    updateFrequencyMinutes: 60,
    layerId: 0
  },
  yorkshire_water: {
    name: "Yorkshire Water",
    endpoint: "https://services-eu1.arcgis.com/1WqkK5cDKUbF0CkH/arcgis/rest/services/Yorkshire_Water_Storm_Overflow_Activity/FeatureServer",
    updateFrequencyMinutes: 60,
    layerId: 0
  },
  southern_water: {
    name: "Southern Water",
    endpoint: "https://services-eu1.arcgis.com/XxS6FebPX29TRGDJ/arcgis/rest/services/Southern_Water_Storm_Overflow_Activity/FeatureServer",
    updateFrequencyMinutes: 15,
    layerId: 0
  },
  severn_trent_water: {
    name: "Severn Trent Water",
    endpoint: "https://services1.arcgis.com/NO7lTIlnxRMMG9Gw/arcgis/rest/services/Severn_Trent_Water_Storm_Overflow_Activity/FeatureServer",
    updateFrequencyMinutes: 60,
    layerId: 0
  }
};

// Polling interval for the bot (in seconds)
// Set to check every minute to catch events as soon as possible
export const POLL_INTERVAL_SECONDS = 60;

// Database configuration
export const DB_PATH = "./storm_overflow_events.db";

// Logging configuration
export const LOG_LEVEL = "INFO";
