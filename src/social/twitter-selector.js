/**
 * Twitter Event Selector
 *
 * X API Free Tier: 17 posts per 24-hour rolling window
 * Post events that lasted over 6 HOURS (360 minutes)
 */

import fs from 'fs';

export class TwitterSelector {
  constructor() {
    // Threshold: 10 hours = 600 minutes
    this.minDurationMinutes = 600; // 10 hours

    // Posting limits (Free tier: 17 posts per 24 hours)
    this.maxPostsPerDay = 17;
    this.dailyPostCount = 0;

    // Stats file for tracking daily posts
    this.statsFile = './config/twitter-stats.json';
  }

  /**
   * Load today's post count
   */
  loadStats() {
    try {
      if (fs.existsSync(this.statsFile)) {
        const stats = JSON.parse(fs.readFileSync(this.statsFile, 'utf8'));
        const today = new Date().toISOString().split('T')[0];
        this.dailyPostCount = stats[today] || 0;
      }
    } catch (error) {
      console.error('Error loading stats:', error.message);
      this.dailyPostCount = 0;
    }
  }

  /**
   * Should we post this event?
   * Post events over 6 hours, up to 17 per day
   */
  shouldPost(event) {
    this.loadStats();

    // Check daily limit (17 posts per 24 hours)
    if (this.dailyPostCount >= this.maxPostsPerDay) {
      return {
        shouldPost: false,
        reason: `Daily limit reached (${this.dailyPostCount}/${this.maxPostsPerDay})`
      };
    }

    // Check duration: Must be over 10 hours
    if (event.durationMinutes < this.minDurationMinutes) {
      const durationHours = (event.durationMinutes / 60).toFixed(1);
      return {
        shouldPost: false,
        reason: `Duration ${durationHours} hours < 10 hours minimum`
      };
    }

    // Post it!
    const durationHours = (event.durationMinutes / 60).toFixed(1);
    const durationDays = (event.durationMinutes / 60 / 24).toFixed(1);

    // Format reason based on duration
    let reason;
    if (event.durationMinutes >= 1440) { // 1 day or more
      reason = `${durationDays} days duration`;
    } else {
      reason = `${durationHours} hours duration`;
    }

    return {
      shouldPost: true,
      reason,
      durationHours,
      durationDays
    };
  }

  /**
   * Record that we posted an event
   */
  recordPost(event) {
    // Increment in-memory counter
    this.dailyPostCount++;

    // Save to stats file
    try {
      const today = new Date().toISOString().split('T')[0];
      let stats = {};

      if (fs.existsSync(this.statsFile)) {
        stats = JSON.parse(fs.readFileSync(this.statsFile, 'utf8'));
      }

      stats[today] = (stats[today] || 0) + 1;
      fs.writeFileSync(this.statsFile, JSON.stringify(stats, null, 2));
    } catch (error) {
      console.error('Error saving post stats:', error.message);
    }

    const durationHours = (event.durationMinutes / 60).toFixed(1);
    const durationDays = (event.durationMinutes / 60 / 24).toFixed(1);

    const duration = event.durationMinutes >= 1440
      ? `${durationDays} days`
      : `${durationHours} hours`;

    console.log(`🚨 POSTED EVENT (${this.dailyPostCount}/${this.maxPostsPerDay} today)`);
    console.log(`   Duration: ${duration}`);
    console.log(`   Company: ${event.waterCompany}`);
    console.log(`   Site: ${event.siteId}`);
  }

  /**
   * Get statistics for logging
   */
  getStats() {
    this.loadStats();
    return {
      dailyTotal: this.dailyPostCount,
      dailyRemaining: this.maxPostsPerDay - this.dailyPostCount,
      threshold: `10 hours`
    };
  }
}
