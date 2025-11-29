/**
 * 90-Minute Post Scheduler
 *
 * Posts to Twitter every 90 minutes (16 posts per day)
 * Evenly distributes posts throughout the 24-hour cycle
 */

export class PostScheduler {
  constructor(eventQueue, twitterPoster, dataGenerator) {
    this.eventQueue = eventQueue;
    this.twitterPoster = twitterPoster;
    this.dataGenerator = dataGenerator;

    // 90 minutes = 5400 seconds = 5400000 ms
    this.intervalMinutes = 90;
    this.intervalMs = this.intervalMinutes * 60 * 1000;

    // Track posts
    this.postsToday = 0;
    this.maxPostsPerDay = 16; // 90min * 16 = 1440 minutes = 24 hours
    this.lastPostDate = null;

    this.timer = null;
    this.isRunning = false;
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
    console.log('⏰ POST SCHEDULER STARTED');
    console.log('='.repeat(70));
    console.log(`📅 Posting every ${this.intervalMinutes} minutes`);
    console.log(`📊 Target: ${this.maxPostsPerDay} posts per day`);
    console.log(`🕐 Next post: ${this.getNextPostTime()}`);
    console.log('='.repeat(70));

    // Post immediately on start
    this.processNextPost();

    // Then schedule regular posts
    this.timer = setInterval(() => {
      this.processNextPost();
    }, this.intervalMs);
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
   * Get next post time as human-readable string
   */
  getNextPostTime() {
    const next = new Date(Date.now() + this.intervalMs);
    return next.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit'
    });
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
        console.log('📭 No postable events in queue (10+ hours)');
        console.log(`🕐 Next cycle: ${this.getNextPostTime()}`);
        console.log('='.repeat(70));
        return;
      }

      console.log(`📦 Events in queue: ${events.length}`);

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

      // Pick the most recent event to tweet about
      const eventToPost = events[0]; // Already sorted by end time (newest first)

      // Generate tweet
      console.log('\\n🐦 Posting to Twitter...');
      const tweetText = this.generateTweet(eventToPost, cycleData.url);

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

          // Mark event as posted
          this.eventQueue.markAsPosted(eventToPost.id);
        } else {
          console.error(`❌ Twitter post failed: ${result.error}`);
        }
      } else {
        console.warn('⚠️  Twitter not configured - skipping post');
      }

      console.log(`\\n🕐 Next cycle: ${this.getNextPostTime()}`);
      console.log('='.repeat(70));

    } catch (error) {
      console.error('❌ Error in post cycle:', error.message);
      console.error(error.stack);
    }
  }

  /**
   * Generate tweet text with GitHub Pages link
   */
  generateTweet(event, githubUrl) {
    const duration = this.formatDuration(event.durationMinutes);
    const company = event.waterCompany;
    const watercourse = event.receivingWatercourse;

    // Shorten company names for space
    const shortCompany = company
      .replace(' Water', '')
      .replace(' Utilities', '');

    const hashtags = this.selectHashtags();
    const grokQuestion = this.selectGrokQuestion(event);

    // Format: Short, punchy, links to details
    const tweet = `🚨 ${shortCompany} dumped sewage for ${duration} into ${watercourse}

📊 Full details: ${githubUrl}

@grok ${grokQuestion}

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
      nextPost: this.getNextPostTime()
    };
  }
}
