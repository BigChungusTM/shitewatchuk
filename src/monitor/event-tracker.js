/**
 * Event Tracker - Monitors and tracks storm overflow events
 *
 * Detects event starts, tracks duration, and detects when events end
 */

import { ArcGISClient } from '../api/arcgis-client.js';
import { EventDatabase } from '../database/db.js';
import { PostGenerator } from '../social/post-generator.js';
import { TwitterPoster } from '../social/twitter-poster.js';
import { TwitterSelector } from '../social/twitter-selector.js';
import { WATER_COMPANIES } from '../../config.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class EventTracker {
  constructor(eventQueue, twitterPoster) {
    this.apiClient = new ArcGISClient();
    this.db = new EventDatabase();
    this.activeEvents = new Map(); // In-memory cache of active events
    this.siteMapping = this.loadSiteMapping(); // Load historical site mapping
    this.eventQueue = eventQueue; // Queue for 10+ hour events
    this.twitterPoster = twitterPoster; // Passed in from main
    this.configPath = path.join(__dirname, '../../config/autonomous-posting.json');
  }

  /**
   * Check if autonomous posting is enabled
   */
  isAutonomousPostingEnabled() {
    try {
      if (fs.existsSync(this.configPath)) {
        const config = JSON.parse(fs.readFileSync(this.configPath, 'utf8'));
        return config.enabled === true;
      }
    } catch (error) {
      console.error('Error reading autonomous posting config:', error.message);
    }
    return false; // Default to disabled
  }

  /**
   * Load site ID mapping (real-time to historical) with flow rates
   */
  loadSiteMapping() {
    // Try to load enriched mapping first, fall back to basic mapping
    const enrichedPath = './site_mapping_with_flow_rates.csv';
    const basicPath = './site_id_mapping.csv';
    const mappingPath = fs.existsSync(enrichedPath) ? enrichedPath : basicPath;

    try {
      if (!fs.existsSync(mappingPath)) {
        console.warn('⚠️  Site mapping not found. Historical context will not be available.');
        return new Map();
      }

      const content = fs.readFileSync(mappingPath, 'utf8');
      const lines = content.trim().split('\n');
      const headers = lines[0].split(',');

      const mapping = new Map();

      for (let i = 1; i < lines.length; i++) {
        const values = this.parseCSVLine(lines[i]);
        if (values.length < headers.length) continue;

        const entry = {};
        headers.forEach((header, idx) => {
          entry[header.trim()] = values[idx] ? values[idx].trim() : '';
        });

        // Map by realtime_site_id
        mapping.set(entry.realtime_site_id, entry);
      }

      console.log(`✓ Loaded ${mapping.size} site mappings with historical data\n`);
      return mapping;
    } catch (error) {
      console.warn(`⚠️  Error loading site mapping: ${error.message}`);
      return new Map();
    }
  }

  /**
   * Parse CSV line handling quoted values
   */
  parseCSVLine(line) {
    const values = [];
    let inQuotes = false;
    let currentValue = '';

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(currentValue);
        currentValue = '';
      } else {
        currentValue += char;
      }
    }
    values.push(currentValue);

    return values;
  }

  /**
   * Parse feature attributes to extract event information
   * All water companies use consistent field names
   */
  parseFeature(feature, waterCompany) {
    const attrs = feature.attributes;
    const geom = feature.geometry;

    // All companies use these standardized fields
    const siteId = attrs.Id;
    // Try to get site name from API, fallback to permit name or location name
    const siteName = attrs.SiteName || attrs.PermitName || attrs.LocationName || attrs.Name || null;
    const status = attrs.Status; // 0 = not discharging, 1 = discharging, -1 = offline/error
    const statusStart = attrs.StatusStart; // When current status started
    const latestEventStart = attrs.LatestEventStart;
    const latestEventEnd = attrs.LatestEventEnd;
    const receivingWatercourse = attrs.ReceivingWaterCourse;

    // Coordinates from attributes
    const latitude = attrs.Latitude;
    const longitude = attrs.Longitude;

    return {
      siteId,
      siteName,
      status,
      statusStart,
      latestEventStart,
      latestEventEnd,
      receivingWatercourse,
      latitude,
      longitude,
      rawData: attrs
    };
  }

  /**
   * Generate event ID from feature
   */
  generateEventId(feature, waterCompany) {
    const parsed = this.parseFeature(feature, waterCompany);
    const companyKey = waterCompany.toLowerCase().replace(/\s+/g, '_');
    return `${companyKey}:${parsed.siteId}`;
  }

  /**
   * Process features from API response and update event tracking
   */
  async processFeatures(waterCompany, features) {
    const companyKey = waterCompany.toLowerCase().replace(/\s+/g, '_');
    const now = Date.now();
    const activeSiteIds = new Set();

    for (const feature of features) {
      const parsed = this.parseFeature(feature, waterCompany);

      if (!parsed.siteId) {
        console.warn(`Skipping feature without site ID for ${waterCompany}`);
        continue;
      }

      // Status values: 0 = not discharging, 1 = discharging, -1 = offline/error
      const isDischarging = parsed.status === 1;

      if (isDischarging) {
        activeSiteIds.add(parsed.siteId);

        // Event is active/discharging
        const eventKey = `${companyKey}:${parsed.siteId}`;
        const startTime = parsed.statusStart || parsed.latestEventStart || now;

        // Check if this is a new event or existing event
        const existingEvent = this.activeEvents.get(eventKey);

        if (!existingEvent) {
          // New event detected (new to our tracking, may have started earlier)
          const actualStartTime = parsed.statusStart || now;
          const durationMinutes = Math.round((now - actualStartTime) / (1000 * 60));

          console.log(`🚨 NEW EVENT DETECTED: ${waterCompany} - Site ${parsed.siteId}`);
          if (parsed.receivingWatercourse) {
            console.log(`   Receiving water: ${parsed.receivingWatercourse}`);
          }
          console.log(`   Duration so far: ${durationMinutes} minutes (${(durationMinutes / 60).toFixed(1)} hours)`);

          // Show historical context if available
          const historicalData = this.siteMapping.get(parsed.siteId);
          if (historicalData) {
            const spillCount = parseInt(historicalData.spill_count_2023) || 0;
            const avgDuration = parseFloat(historicalData.avg_duration_per_spill_hrs) || 0;
            if (spillCount > 0) {
              console.log(`   📊 2023 History: ${spillCount} spills, avg ${avgDuration.toFixed(1)} hrs each`);
            }
          }

          const event = {
            id: eventKey, // Unique ID for this event
            waterCompany,
            siteId: parsed.siteId,
            siteName: parsed.siteName,
            latitude: parsed.latitude,
            longitude: parsed.longitude,
            startTime: actualStartTime,
            endTime: null,
            durationMinutes: null, // Will be calculated when event ends
            status: 'active',
            receivingWatercourse: parsed.receivingWatercourse,
            rawData: parsed.rawData
          };

          this.db.upsertEvent(event);
          this.activeEvents.set(eventKey, event);
        } else {
          // Existing active event - update if needed
          existingEvent.rawData = parsed.rawData;
          existingEvent.receivingWatercourse = parsed.receivingWatercourse;
          this.db.upsertEvent(existingEvent);
        }
      }
    }

    // Check for events that have ended (were active but no longer discharging)
    for (const [eventKey, event] of this.activeEvents.entries()) {
      if (eventKey.startsWith(companyKey + ':')) {
        const siteId = event.siteId;
        if (!activeSiteIds.has(siteId)) {
          // Event has ended - EVENT END
          const endTime = now;
          const durationMinutes = Math.round((endTime - event.startTime) / (1000 * 60));

          event.endTime = endTime;
          event.durationMinutes = durationMinutes;
          event.status = 'completed';

          // Generate discharge summary
          this.generateDischargeSummary(event, waterCompany);

          this.db.upsertEvent(event);
          this.activeEvents.delete(eventKey);
        }
      }
    }
  }

  /**
   * Generate discharge summary when event completes
   */
  generateDischargeSummary(event, waterCompany) {
    const durationMinutes = event.durationMinutes;
    const durationHours = (durationMinutes / 60).toFixed(2);
    const durationDays = (durationMinutes / (60 * 24)).toFixed(2);

    // Format duration based on length
    let durationDisplay;
    if (durationMinutes < 60) {
      durationDisplay = `${durationMinutes} minutes`;
    } else if (durationMinutes < 60 * 24) {
      durationDisplay = `${durationHours} hours`;
    } else {
      durationDisplay = `${durationDays} days (${durationHours} hours)`;
    }

    console.log('\n' + '='.repeat(70));
    console.log('🛑 DISCHARGE EVENT COMPLETED');
    console.log('='.repeat(70));
    console.log(`Water Company: ${waterCompany}`);
    console.log(`Site ID: ${event.siteId}`);

    if (event.latitude && event.longitude) {
      console.log(`Location: ${event.latitude}, ${event.longitude}`);
    }

    if (event.receivingWatercourse) {
      console.log(`Receiving Watercourse: ${event.receivingWatercourse}`);
    }

    console.log(`\nDischarge Duration: ${durationDisplay}`);
    console.log(`Started: ${new Date(event.startTime).toLocaleString()}`);
    console.log(`Ended: ${new Date(event.endTime).toLocaleString()}`);

    // Look up historical data
    const historicalData = this.siteMapping.get(event.siteId);

    if (historicalData) {
      console.log(`\n📊 HISTORICAL CONTEXT (2023 Data)`);
      console.log(`Historical Site ID: ${historicalData.historical_site_id}`);
      console.log(`Confidence: ${historicalData.confidence} (${historicalData.distance_meters}m match)`);

      const spillCount2023 = parseInt(historicalData.spill_count_2023) || 0;
      const avgDuration2023 = parseFloat(historicalData.avg_duration_per_spill_hrs) || 0;
      const totalDuration2023 = parseFloat(historicalData.total_duration_hrs_2023) || 0;

      console.log(`\nSpills in 2023: ${spillCount2023}`);

      if (spillCount2023 > 0) {
        console.log(`Average duration per spill: ${avgDuration2023.toFixed(2)} hours`);
        console.log(`Total discharge time in 2023: ${totalDuration2023.toFixed(2)} hours`);

        // Estimate discharge volume based on historical average
        const estimatedVolumeHrs = parseFloat(durationHours);

        console.log(`\n💧 ESTIMATED DISCHARGE VOLUME`);
        console.log(`Note: Based on historical average discharge rate`);

        if (avgDuration2023 > 0) {
          // Calculate how this event compares to historical average
          const comparisonPercent = ((estimatedVolumeHrs / avgDuration2023) * 100).toFixed(0);

          if (estimatedVolumeHrs > avgDuration2023 * 1.5) {
            console.log(`⚠️  This event was ${comparisonPercent}% of typical duration (ABOVE AVERAGE)`);
          } else if (estimatedVolumeHrs < avgDuration2023 * 0.5) {
            console.log(`✓ This event was ${comparisonPercent}% of typical duration (below average)`);
          } else {
            console.log(`≈ This event was ${comparisonPercent}% of typical duration (near average)`);
          }
        }

        // Calculate volume if flow rate is available
        const hasFlowRate = historicalData.has_flow_rate === 'yes';
        const flowRate = parseFloat(historicalData.estimated_flow_m3_hour);

        if (hasFlowRate && flowRate > 0) {
          const volumeM3 = (estimatedVolumeHrs * flowRate).toFixed(0);
          const volumeLiters = (volumeM3 * 1000).toLocaleString();
          const volumeMegaliters = (volumeM3 / 1000).toFixed(2);

          // Olympic pool = 2,500 m³
          const olympicPools = (volumeM3 / 2500).toFixed(2);

          console.log(`\n💧 ESTIMATED DISCHARGE VOLUME`);
          console.log(`Calculation: ${durationHours} hours × ${flowRate} m³/hour`);
          console.log(`\n🚰 Estimated Volume:`);
          console.log(`   ${volumeM3} m³`);
          console.log(`   ${volumeLiters} liters`);
          console.log(`   ${volumeMegaliters} megaliters`);
          if (parseFloat(olympicPools) >= 0.1) {
            console.log(`   ≈ ${olympicPools} Olympic swimming pools`);
          }

          console.log(`\n📋 Flow Rate Details:`);
          console.log(`   Source: ${historicalData.flow_rate_source || 'Permit data'}`);
          console.log(`   Permit: ${historicalData.permit_ref || 'Unknown'}`);
          if (historicalData.max_rate_l_s) {
            console.log(`   Max rate: ${historicalData.max_rate_l_s} l/s`);
          }

          console.log(`\n⚠️  DISCLAIMER:`);
          console.log(`   This is an ESTIMATE based on permitted maximum flow rates.`);
          console.log(`   Actual discharge volume may be lower.`);
          console.log(`   Not measured data - for indication only.`);
        } else {
          console.log(`\n⚠️  Volume calculation not available`);
          console.log(`   Permit Reference: ${historicalData.permit_ref || 'Not available'}`);
          console.log(`   Flow rate data not found for this permit`);
        }
      } else {
        console.log(`No spills recorded in 2023 for this site`);
      }
    } else {
      console.log(`\n⚠️  No historical data available for site ${event.siteId}`);
    }

    console.log('='.repeat(70) + '\n');

    // Add ALL completed events to queue
    const added = this.eventQueue.addEvent(event);

    if (added) {
      console.log(`✅ Event added to queue`);
      console.log(`   Will be included in next 90-minute cycle post`);
    } else {
      console.log(`ℹ️  Event already posted in previous cycle`);
    }
  }

  /**
   * Post event to Twitter
   */
  async postToTwitter(event, historicalData) {
    try {
      // Generate post text using Ollama
      const postResult = await this.postGenerator.generatePost(event, historicalData);

      if (!postResult || !postResult.success) {
        console.error('Failed to generate post');
        return;
      }

      // Use the generated post text directly
      const postText = postResult.post;

      // Post to Twitter
      if (this.twitterPoster.isConfigured) {
        const result = await this.twitterPoster.tweet(postText);

        if (result.success) {
          console.log(`✅ Posted to Twitter!`);
          console.log(`   Tweet ID: ${result.tweetId}`);
          console.log(`   URL: ${result.url}`);

          // Record the post
          this.twitterSelector.recordPost(event);

          // Show stats
          const stats = this.twitterSelector.getStats();
          console.log(`   Daily posts: ${stats.dailyTotal}/${this.twitterSelector.maxPostsPerDay}`);
        } else {
          console.error(`❌ Failed to post to Twitter: ${result.error}`);
        }
      } else {
        console.warn('⚠️  Twitter not configured - post saved to file only');
      }

    } catch (error) {
      console.error(`Error posting to Twitter: ${error.message}`);
    }
  }

  /**
   * Main entry point - check all water company APIs for active events
   */
  async checkAPI() {
    const timestamp = new Date().toLocaleTimeString('en-GB');
    console.log(`\n🔍 [${timestamp}] Checking water company APIs...`);

    const previousActiveCount = this.activeEvents.size;
    const previousQueueCount = this.eventQueue.getPostableEvents().length;

    let totalEvents = 0;
    let newEventsStarted = 0;
    let eventsEnded = 0;

    // Track current event IDs from API
    const currentEventIds = new Set();

    // Check each water company
    for (const [key, company] of Object.entries(WATER_COMPANIES)) {
      try {
        const result = await this.apiClient.getAllOverflows(company.endpoint, company.layerId);

        if (result.features && result.features.length > 0) {
          totalEvents += result.features.length;
          await this.processFeatures(company.name, result.features);

          // Track which events are currently active
          for (const feature of result.features) {
            const eventId = this.generateEventId(feature, company.name);
            currentEventIds.add(eventId);
          }
        }
      } catch (error) {
        console.error(`  ❌ ${company.name} error:`, error.message);
      }
    }

    // Detect ended events (in activeEvents but not in current API response)
    for (const eventId of this.activeEvents.keys()) {
      if (!currentEventIds.has(eventId)) {
        eventsEnded++;
      }
    }

    // Detect new events
    newEventsStarted = this.activeEvents.size - previousActiveCount + eventsEnded;

    const activeCount = this.activeEvents.size;
    const queueStats = this.eventQueue.getStats();
    const queueCount = this.eventQueue.getPostableEvents().length;

    // Summary
    console.log(`📊 Active: ${activeCount} | Queue: ${queueCount} (${queueStats.rawMapSize} total in map, ${queueStats.posted} marked posted)`);

    if (newEventsStarted > 0) {
      console.log(`   🆕 ${newEventsStarted} new event(s) started`);
    }
    if (eventsEnded > 0) {
      console.log(`   ✅ ${eventsEnded} event(s) ended`);
    }
    if (queueCount > previousQueueCount) {
      console.log(`   📥 ${queueCount - previousQueueCount} event(s) added to queue`);
    }
  }

  /**
   * Monitor a single water company
   */
  async monitorCompany(companyConfig) {
    try {
      console.log(`Checking ${companyConfig.name}...`);

      const result = await this.apiClient.getAllOverflows(
        companyConfig.endpoint,
        companyConfig.layerId
      );

      if (result.features && result.features.length > 0) {
        await this.processFeatures(companyConfig.name, result.features);
        console.log(`  ✓ Processed ${result.features.length} overflow sites`);
      } else {
        console.log(`  ℹ No features returned`);
      }

    } catch (error) {
      console.error(`Error monitoring ${companyConfig.name}:`, error.message);
    }
  }

  /**
   * Get statistics about current monitoring
   */
  getStats() {
    const activeCount = this.activeEvents.size;
    const recentCompleted = this.db.getRecentlyCompletedEvents(24);

    return {
      activeEvents: activeCount,
      completedLast24h: recentCompleted.length,
      activeEventsList: Array.from(this.activeEvents.values())
    };
  }

  /**
   * Close database connection
   */
  close() {
    this.db.close();
  }
}
