/**
 * ArcGIS FeatureServer API Client
 *
 * Handles communication with ArcGIS REST API endpoints to fetch storm overflow data
 */

import fetch from 'node-fetch';

export class ArcGISClient {
  /**
   * Query a FeatureServer layer for all features
   *
   * @param {string} endpoint - Base FeatureServer endpoint URL
   * @param {number} layerId - Layer ID to query (default: 0)
   * @param {object} options - Additional query options
   * @returns {Promise<object>} - GeoJSON feature collection
   */
  async queryLayer(endpoint, layerId = 0, options = {}) {
    const queryUrl = `${endpoint}/${layerId}/query`;

    const params = new URLSearchParams({
      where: options.where || '1=1', // Query all features by default
      outFields: options.outFields || '*', // Return all fields
      f: 'json', // Response format
      returnGeometry: options.returnGeometry !== false ? 'true' : 'false',
      ...options.additionalParams
    });

    const url = `${queryUrl}?${params.toString()}`;

    try {
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(`ArcGIS API error: ${data.error.message}`);
      }

      return data;
    } catch (error) {
      console.error(`Failed to query layer ${layerId} from ${endpoint}:`, error.message);
      throw error;
    }
  }

  /**
   * Get active storm overflow events (currently discharging)
   *
   * @param {string} endpoint - Base FeatureServer endpoint URL
   * @param {number} layerId - Layer ID to query
   * @param {string} statusField - Name of the status field (varies by water company)
   * @returns {Promise<object>} - Features with active status
   */
  async getActiveEvents(endpoint, layerId = 0, statusField = 'Status') {
    return await this.queryLayer(endpoint, layerId, {
      where: `${statusField} = 'Discharging' OR ${statusField} = 'Active'`,
      outFields: '*'
    });
  }

  /**
   * Get all overflow locations and their current status
   *
   * @param {string} endpoint - Base FeatureServer endpoint URL
   * @param {number} layerId - Layer ID to query
   * @returns {Promise<object>} - All features
   */
  async getAllOverflows(endpoint, layerId = 0) {
    return await this.queryLayer(endpoint, layerId, {
      where: '1=1',
      outFields: '*'
    });
  }

  /**
   * Get layer metadata/information
   *
   * @param {string} endpoint - Base FeatureServer endpoint URL
   * @param {number} layerId - Layer ID
   * @returns {Promise<object>} - Layer metadata
   */
  async getLayerInfo(endpoint, layerId = 0) {
    const url = `${endpoint}/${layerId}?f=json`;

    try {
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(`ArcGIS API error: ${data.error.message}`);
      }

      return data;
    } catch (error) {
      console.error(`Failed to get layer info from ${endpoint}:`, error.message);
      throw error;
    }
  }
}
