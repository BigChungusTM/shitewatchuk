/**
 * 90-Minute Post Scheduler
 *
 * Posts to Twitter at fixed times every 90 minutes (16 posts per day)
 * Schedule: 00:00, 01:30, 03:00, 04:30, 06:00, 07:30, 09:00, 10:30,
 *           12:00, 13:30, 15:00, 16:30, 18:00, 19:30, 21:00, 22:30
 */

export class PostScheduler {
  constructor(eventQueue, twitterPoster, dataGenerator) {
    this.eventQueue = eventQueue;
    this.twitterPoster = twitterPoster;
    this.dataGenerator = dataGenerator;

    // 90 minutes = 5400 seconds = 5400000 ms
    this.intervalMinutes = 90;
    this.intervalMs = this.intervalMinutes * 60 * 1000;

    // Fixed posting times (minutes from midnight)
    // 00:00, 01:30, 03:00, 04:30, etc.
    this.postingTimes = [];
    for (let i = 0; i < 16; i++) {
      this.postingTimes.push(i * 90); // 0, 90, 180, 270, etc.
    }

    // Track posts
    this.postsToday = 0;
    this.maxPostsPerDay = 16;
    this.lastPostDate = null;

    this.timer = null;
    this.isRunning = false;
  }

  /**
   * Get next scheduled post time
   */
  getNextScheduledTime() {
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    // Find next posting time
    for (const postTime of this.postingTimes) {
      if (postTime > currentMinutes) {
        const hours = Math.floor(postTime / 60);
        const minutes = postTime % 60;
        const nextTime = new Date(now);
        nextTime.setHours(hours, minutes, 0, 0);
        return nextTime;
      }
    }

    // If no more posts today, return first post tomorrow
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return tomorrow;
  }

  /**
   * Calculate ms until next scheduled post
   */
  getMsUntilNextPost() {
    const next = this.getNextScheduledTime();
    return next.getTime() - Date.now();
  }

  /**
   * Start the scheduler
   */
  start() {
    if (this.isRunning) {
      console.log('⏰ Scheduler already running');
      return;
    }

    this.isRunning = true;
    console.log('='.repeat(70));
    console.log('⏰ POST SCHEDULER STARTED (Fixed Schedule Mode)');
    console.log('='.repeat(70));
    console.log(`📅 Posting at fixed times every ${this.intervalMinutes} minutes`);
    console.log(`📊 Schedule: 00:00, 01:30, 03:00, 04:30, 06:00, 07:30, 09:00, 10:30,`);
    console.log(`            12:00, 13:30, 15:00, 16:30, 18:00, 19:30, 21:00, 22:30`);
    console.log(`🕐 Next post: ${this.getNextScheduledTime().toLocaleTimeString('en-GB')}`);
    console.log('='.repeat(70));

    // Schedule next post
    this.scheduleNextPost();
  }

  /**
   * Schedule the next post at the correct time
   */
  scheduleNextPost() {
    if (this.timer) {
      clearTimeout(this.timer);
    }

    const msUntilNext = this.getMsUntilNextPost();
    const nextTime = this.getNextScheduledTime();

    console.log(`⏰ Next post scheduled for: ${nextTime.toLocaleString('en-GB')}`);
    console.log(`   (in ${Math.round(msUntilNext / 60000)} minutes)`);

    this.timer = setTimeout(async () => {
      await this.processNextPost();
      // Schedule the following post
      this.scheduleNextPost();
    }, msUntilNext);
  }

  /**
   * Stop the scheduler
   */
  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.isRunning = false;
    console.log('⏰ Scheduler stopped');
  }

  /**
   * Reset daily counter if it's a new day
   */
  resetDailyCounterIfNeeded() {
    const today = new Date().toISOString().split('T')[0];

    if (this.lastPostDate !== today) {
      this.postsToday = 0;
      this.lastPostDate = today;
      console.log(`🗓️  New day detected. Counter reset to 0`);
    }
  }

  /**
   * Process the next post in the queue
   */
  async processNextPost() {
    try {
      this.resetDailyCounterIfNeeded();

      console.log('\\n' + '='.repeat(70));
      console.log(`⏰ POST CYCLE ${this.postsToday + 1}/${this.maxPostsPerDay}`);
      console.log(`🕐 ${new Date().toLocaleString('en-GB')}`);
      console.log('='.repeat(70));

      // Get all 10+ hour events from queue
      const events = this.eventQueue.getPostableEvents();

      if (events.length === 0) {
        console.log('📭 No events in queue');
        console.log(`🕐 Next cycle: ${this.getNextPostTime()}`);
        console.log('='.repeat(70));
        return;
      }

      console.log(`📦 Events in queue: ${events.length} (sorted by duration)`);

      // Generate GitHub Pages data for this cycle
      console.log('\\n📊 Generating GitHub Pages data...');
      const cycleData = await this.dataGenerator.generateCycleData(events);

      if (!cycleData.success) {
        console.error('❌ Failed to generate cycle data');
        return;
      }

      console.log(`✓ Cycle data generated: ${cycleData.filepath}`);
      console.log(`✓ URL: ${cycleData.url}`);

      // Commit and push to GitHub
      console.log('\\n📤 Publishing to GitHub...');
      const published = await this.dataGenerator.publishToGitHub(cycleData);

      if (!published.success) {
        console.error('❌ Failed to publish to GitHub');
        return;
      }

      console.log(`✓ Published to GitHub`);

      // Generate tweet highlighting worst offenders
      console.log('\\n🐦 Posting to Twitter...');
      const tweetText = this.generateTweet(events, cycleData);

      console.log('Tweet preview:');
      console.log('-'.repeat(70));
      console.log(tweetText);
      console.log('-'.repeat(70));
      console.log(`Characters: ${tweetText.length}/280`);

      // Post to Twitter
      if (this.twitterPoster.isConfigured) {
        const result = await this.twitterPoster.tweet(tweetText);

        if (result.success) {
          this.postsToday++;
          console.log(`\\n✅ POSTED TO TWITTER!`);
          console.log(`   Tweet ID: ${result.tweetId}`);
          console.log(`   URL: ${result.url}`);
          console.log(`   Posts today: ${this.postsToday}/${this.maxPostsPerDay}`);

          // Mark ALL events in this cycle as posted
          for (const event of events) {
            this.eventQueue.markAsPosted(event.id);
          }
          console.log(`   Marked ${events.length} events as posted`);
        } else {
          console.error(`❌ Twitter post failed: ${result.error}`);
        }
      } else {
        console.warn('⚠️  Twitter not configured - skipping post');
      }

      console.log('='.repeat(70));

    } catch (error) {
      console.error('❌ Error in post cycle:', error.message);
      console.error(error.stack);
    }
  }

  /**
   * Generate tweet highlighting worst offenders
   */
  generateTweet(events, cycleData) {
    // Get worst offender (longest duration - already sorted)
    const worstEvent = events[0];
    const duration = this.formatDuration(worstEvent.durationMinutes);

    // Shorten company name
    const shortCompany = worstEvent.waterCompany
      .replace(' Water', '')
      .replace(' Utilities', '');

    const hashtags = this.selectHashtags();

    // Link to the feed page (webpage view), not the raw JSON
    // Extract base URL from cycle URL (e.g., https://bigchungustm.github.io)
    const baseUrl = cycleData.url.substring(0, cycleData.url.indexOf('/cycles/'));
    const feedUrl = `${baseUrl}/feed.html`;

    // Format: Highlight worst offender, encourage clicking link
    const tweet = `🚨 Latest sewage discharges (90-min cycle)

Worst offender: ${shortCompany}
Duration: ${duration}
${cycleData.data.eventCount} total events tracked

📊 See all data: ${feedUrl}

${hashtags}`;

    return tweet;
  }

  /**
   * Format duration concisely
   */
  formatDuration(minutes) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;

    if (days > 0) {
      return mins > 0
        ? `${days}d ${remainingHours}h ${mins}m`
        : `${days}d ${remainingHours}h`;
    }

    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  }

  /**
   * Select 2-3 random hashtags
   */
  selectHashtags() {
    const hashtags = [
      '#SewageScandal',
      '#EndSewagePollution',
      '#WaterPollution',
      '#StopSewageDumping',
      '#CleanWaterNow'
    ];

    const count = 2 + Math.floor(Math.random() * 2); // 2-3
    const shuffled = [...hashtags].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count).join(' ');
  }

  /**
   * Select appropriate Grok question based on duration
   */
  selectGrokQuestion(event) {
    const longDuration = event.durationMinutes >= 1440; // 1+ days

    const longQuestions = [
      "What's the environmental impact of this discharge?",
      "How long does river recovery take after this?",
      "What damage can sewage do in this time period?"
    ];

    const shortQuestions = [
      "What damage can sewage do in this time period?",
      "How does this affect local wildlife?",
      "What are the health risks from sewage in waterways?"
    ];

    const questions = longDuration ? longQuestions : shortQuestions;
    return questions[Math.floor(Math.random() * questions.length)];
  }

  /**
   * Get scheduler status
   */
  getStatus() {
    return {
      running: this.isRunning,
      postsToday: this.postsToday,
      maxPosts: this.maxPostsPerDay,
      intervalMinutes: this.intervalMinutes,
      nextPost: this.getNextScheduledTime().toLocaleTimeString('en-GB'),
      schedule: '00:00, 01:30, 03:00, 04:30, 06:00, 07:30, 09:00, 10:30, 12:00, 13:30, 15:00, 16:30, 18:00, 19:30, 21:00, 22:30'
    };
  }
}
