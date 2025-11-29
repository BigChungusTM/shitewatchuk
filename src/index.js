/**
 * ShitWatch UK - Main Entry Point
 *
 * Production system that monitors EA API, posts every 90 minutes,
 * and publishes data to GitHub Pages
 */

import dotenv from 'dotenv';
import { EventTracker } from './monitor/event-tracker.js';
import { EventQueue } from './scheduler/event-queue.js';
import { PostScheduler } from './scheduler/post-scheduler.js';
import { CycleGenerator } from './data-generator/cycle-generator.js';
import { AISummarizer } from './data-generator/ai-summarizer.js';
import { GitHubPublisher } from './github-publisher/github-publisher.js';
import { TwitterPoster } from './social/twitter-poster.js';

dotenv.config();

console.log('='.repeat(70));
console.log('💩 SHITWATCH UK - PRODUCTION SYSTEM');
console.log('='.repeat(70));
console.log('');
console.log('📋 Configuration:');
console.log(`   Ollama: ${process.env.OLLAMA_URL}`);
console.log(`   GitHub: ${process.env.GITHUB_USERNAME}/${process.env.GITHUB_REPO_NAME}`);
console.log(`   Twitter: ${process.env.TWITTER_API_KEY ? 'Configured' : 'Not configured'}`);
console.log('');
console.log('🎯 Settings:');
console.log('   Monitoring interval: 1 minute');
console.log('   Posting interval: 90 minutes');
console.log('   Duration filter: ALL events (no minimum)');
console.log('   Daily posts: 16 maximum');
console.log('');
console.log('='.repeat(70));
console.log('');

async function main() {
  try {
    // Initialize components
    console.log('🔧 Initializing components...');

    const githubPublisher = new GitHubPublisher(
      process.env.GITHUB_USERNAME || 'bigchungustm',
      process.env.GITHUB_REPO_NAME || '.github.io'
    );

    const aiSummarizer = new AISummarizer();
    const cycleGenerator = new CycleGenerator(githubPublisher, aiSummarizer);
    const twitterPoster = new TwitterPoster();
    const eventQueue = new EventQueue();
    const eventTracker = new EventTracker(eventQueue, twitterPoster);

    const postScheduler = new PostScheduler(
      eventQueue,
      twitterPoster,
      cycleGenerator
    );

    console.log('✓ All components initialized');
    console.log('');

    // Start post scheduler (90-minute cycles)
    console.log('⏰ Starting post scheduler...');
    postScheduler.start();
    console.log('');

    // Start monitoring loop (every 5 minutes)
    console.log('👀 Starting EA API monitoring...');

    // Initial check
    await eventTracker.checkAPI();

    // Set up 1-minute monitoring interval
    setInterval(async () => {
      try {
        await eventTracker.checkAPI();
      } catch (error) {
        console.error('❌ Error in monitoring loop:', error.message);
      }
    }, 60 * 1000); // 1 minute

    console.log('✅ System running!');
    console.log('');
    console.log('📊 Monitoring:');
    console.log('   - Checking water company APIs every 1 minute');
    console.log('   - Tracking ALL completed discharge events');
    console.log('   - Posting to Twitter every 90 minutes');
    console.log('   - Publishing to GitHub Pages automatically');
    console.log('');
    console.log('Press Ctrl+C to stop');
    console.log('='.repeat(70));

  } catch (error) {
    console.error('');
    console.error('❌ FATAL ERROR:');
    console.error(error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('');
  console.log('='.repeat(70));
  console.log('⏹️  Shutting down gracefully...');
  console.log('='.repeat(70));
  process.exit(0);
});

// Start the system
main();
