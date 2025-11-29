/**
 * Database module for storing storm overflow events
 *
 * Uses JSON file storage to track event start times, durations, and status changes
 */

import fs from 'fs';
import path from 'path';
import { DB_PATH } from '../../config.js';

export class EventDatabase {
  constructor(dbPath = DB_PATH) {
    this.dbPath = dbPath.replace('.db', '.json');
    this.data = this.loadData();
    console.log('Database initialized successfully');
  }

  /**
   * Load data from JSON file
   */
  loadData() {
    try {
      if (fs.existsSync(this.dbPath)) {
        const rawData = fs.readFileSync(this.dbPath, 'utf8');
        return JSON.parse(rawData);
      }
    } catch (error) {
      console.warn('Failed to load database, starting fresh:', error.message);
    }
    return { events: [], nextId: 1 };
  }

  /**
   * Save data to JSON file
   */
  saveData() {
    try {
      const dir = path.dirname(this.dbPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.dbPath, JSON.stringify(this.data, null, 2), 'utf8');
    } catch (error) {
      console.error('Failed to save database:', error.message);
    }
  }

  /**
   * Insert or update an event
   *
   * @param {object} event - Event data
   * @returns {number} - Event ID
   */
  upsertEvent(event) {
    const key = `${event.waterCompany}:${event.siteId}:${event.startTime}`;

    // Find existing event
    const existingIndex = this.data.events.findIndex(e =>
      e.waterCompany === event.waterCompany &&
      e.siteId === event.siteId &&
      e.startTime === event.startTime
    );

    const eventData = {
      id: existingIndex >= 0 ? this.data.events[existingIndex].id : this.data.nextId++,
      waterCompany: event.waterCompany,
      siteId: event.siteId,
      siteName: event.siteName || null,
      latitude: event.latitude || null,
      longitude: event.longitude || null,
      startTime: event.startTime,
      endTime: event.endTime || null,
      durationMinutes: event.durationMinutes || null,
      status: event.status,
      receivingWatercourse: event.receivingWatercourse || null,
      lastUpdated: Date.now(),
      rawData: event.rawData || {}
    };

    if (existingIndex >= 0) {
      this.data.events[existingIndex] = eventData;
    } else {
      this.data.events.push(eventData);
    }

    this.saveData();
    return eventData.id;
  }

  /**
   * Get active events (currently discharging)
   *
   * @returns {array} - Active events
   */
  getActiveEvents() {
    return this.data.events
      .filter(e => e.status === 'active')
      .sort((a, b) => b.startTime - a.startTime);
  }

  /**
   * Get all events for a specific water company
   *
   * @param {string} waterCompany - Water company name
   * @returns {array} - Events
   */
  getEventsByCompany(waterCompany) {
    return this.data.events
      .filter(e => e.waterCompany === waterCompany)
      .sort((a, b) => b.startTime - a.startTime);
  }

  /**
   * Get recently completed events (for potential social media posts)
   *
   * @param {number} hoursAgo - How many hours back to look
   * @returns {array} - Recently completed events
   */
  getRecentlyCompletedEvents(hoursAgo = 24) {
    const cutoffTime = Date.now() - (hoursAgo * 60 * 60 * 1000);
    return this.data.events
      .filter(e => e.status === 'completed' && e.endTime && e.endTime > cutoffTime)
      .sort((a, b) => b.endTime - a.endTime);
  }

  /**
   * Get event by site and start time
   *
   * @param {string} waterCompany - Water company name
   * @param {string} siteId - Site ID
   * @param {number} startTime - Start timestamp
   * @returns {object|null} - Event or null
   */
  getEvent(waterCompany, siteId, startTime) {
    return this.data.events.find(e =>
      e.waterCompany === waterCompany &&
      e.siteId === siteId &&
      e.startTime === startTime
    ) || null;
  }

  /**
   * Close database connection
   */
  close() {
    this.saveData();
  }
}
