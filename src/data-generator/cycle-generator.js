/**
 * Cycle Data Generator
 *
 * Generates JSON data files for each 90-minute cycle
 * Creates AI summary of events
 * Prepares data for GitHub Pages
 */

import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class CycleGenerator {
  constructor(githubPublisher, aiSummarizer) {
    this.githubPublisher = githubPublisher;
    this.aiSummarizer = aiSummarizer;

    this.cyclesDir = path.join(__dirname, '../../website/cycles');
    this.eventsDir = path.join(__dirname, '../../website/events');

    // Ensure directories exist
    if (!fs.existsSync(this.cyclesDir)) {
      fs.mkdirSync(this.cyclesDir, { recursive: true });
    }
    if (!fs.existsSync(this.eventsDir)) {
      fs.mkdirSync(this.eventsDir, { recursive: true });
    }
  }

  /**
   * Generate cycle data file
   */
  async generateCycleData(events) {
    try {
      const timestamp = new Date().toISOString();
      const cycleId = timestamp.replace(/[:.]/g, '-').split('T').join('_').substring(0, 19);

      console.log(`📝 Generating cycle data for ${events.length} events...`);

      // Generate AI summary
      const summary = await this.aiSummarizer.generateSummary(events);

      // Build cycle data
      const cycleData = {
        id: cycleId,
        timestamp: timestamp,
        eventCount: events.length,
        summary: summary,
        events: events.map(e => ({
          id: e.id,
          company: e.waterCompany,
          siteId: e.siteId,
          siteName: e.siteName || e.siteId,
          watercourse: e.receivingWatercourse,
          latitude: e.latitude,
          longitude: e.longitude,
          startTime: e.startTime,
          endTime: e.endTime,
          durationMinutes: e.durationMinutes,
          durationFormatted: this.formatDuration(e.durationMinutes),
          mapsLink: `https://maps.google.com/?q=${e.latitude},${e.longitude}`
        }))
      };

      // Save to file
      const filename = `${cycleId}.json`;
      const filepath = path.join(this.cyclesDir, filename);
      fs.writeFileSync(filepath, JSON.stringify(cycleData, null, 2), 'utf8');

      console.log(`✓ Saved cycle data: ${filename}`);

      // Generate GitHub Pages URL (will be available after push)
      const githubUrl = this.githubPublisher.getUrl(`cycles/${filename}.html`);

      return {
        success: true,
        cycleId: cycleId,
        filepath: filepath,
        filename: filename,
        url: githubUrl,
        data: cycleData
      };

    } catch (error) {
      console.error('Error generating cycle data:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Update manifest file (list of all cycles)
   */
  updateManifest(cycleFilename) {
    const manifestPath = path.join(this.cyclesDir, 'manifest.json');
    let manifest = { cycles: [] };

    // Load existing manifest
    if (fs.existsSync(manifestPath)) {
      manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    }

    // Add new cycle at the beginning (newest first)
    manifest.cycles.unshift(cycleFilename);

    // Keep only last 100 cycles in manifest
    manifest.cycles = manifest.cycles.slice(0, 100);
    manifest.lastUpdated = new Date().toISOString();

    // Save manifest
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');

    return manifestPath;
  }

  /**
   * Publish cycle to GitHub
   */
  async publishToGitHub(cycleData) {
    try {
      // Update manifest
      const manifestPath = this.updateManifest(cycleData.filename);

      // Add cycle file and manifest to git
      await this.githubPublisher.add(cycleData.filepath);
      await this.githubPublisher.add(manifestPath);

      // Commit
      const commitMessage = `Add cycle ${cycleData.cycleId} (${cycleData.data.eventCount} events)`;
      await this.githubPublisher.commit(commitMessage);

      // Push
      await this.githubPublisher.push();

      return { success: true };
    } catch (error) {
      console.error('Error publishing to GitHub:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Format duration
   */
  formatDuration(minutes) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;

    if (days > 0) {
      if (remainingHours > 0 && mins > 0) {
        return `${days}d ${remainingHours}h ${mins}m`;
      } else if (remainingHours > 0) {
        return `${days}d ${remainingHours}h`;
      }
      return `${days}d`;
    }

    if (mins > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${hours}h`;
  }
}
