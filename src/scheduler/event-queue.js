/**
 * Event Queue
 *
 * Manages queue of 10+ hour events ready to be posted
 * Sorted by end time (most recent first)
 */

export class EventQueue {
  constructor() {
    this.events = new Map(); // id -> event object
    this.postedEvents = new Set(); // IDs of already-posted events
    this.minDurationMinutes = 600; // 10 hours
  }

  /**
   * Add event to queue if it meets criteria
   */
  addEvent(event) {
    // Check duration
    if (event.durationMinutes < this.minDurationMinutes) {
      return false;
    }

    // Check if already posted
    if (this.postedEvents.has(event.id)) {
      return false;
    }

    // Add to queue
    this.events.set(event.id, {
      ...event,
      addedToQueue: new Date().toISOString()
    });

    console.log(`✓ Added to queue: ${event.waterCompany} - ${event.siteId} (${this.formatDuration(event.durationMinutes)})`);
    return true;
  }

  /**
   * Get all postable events (sorted by end time, newest first)
   */
  getPostableEvents() {
    const events = Array.from(this.events.values());

    // Filter out already posted
    const unposted = events.filter(e => !this.postedEvents.has(e.id));

    // Sort by end time (most recent first)
    unposted.sort((a, b) => {
      const timeA = new Date(a.endTime).getTime();
      const timeB = new Date(b.endTime).getTime();
      return timeB - timeA; // Descending
    });

    return unposted;
  }

  /**
   * Mark event as posted
   */
  markAsPosted(eventId) {
    this.postedEvents.add(eventId);
    console.log(`✓ Marked as posted: ${eventId}`);
  }

  /**
   * Get queue stats
   */
  getStats() {
    const all = Array.from(this.events.values());
    const unposted = all.filter(e => !this.postedEvents.has(e.id));

    return {
      total: all.length,
      unposted: unposted.length,
      posted: this.postedEvents.size,
      threshold: `${this.minDurationMinutes / 60} hours`
    };
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
      return `${days}d ${remainingHours}h`;
    }
    return `${hours}h ${mins}m`;
  }

  /**
   * Clean old events (remove events older than 7 days)
   */
  cleanup() {
    const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    let removed = 0;

    for (const [id, event] of this.events.entries()) {
      const endTime = new Date(event.endTime).getTime();
      if (endTime < sevenDaysAgo) {
        this.events.delete(id);
        removed++;
      }
    }

    if (removed > 0) {
      console.log(`🗑️  Cleaned ${removed} old events from queue`);
    }
  }
}
