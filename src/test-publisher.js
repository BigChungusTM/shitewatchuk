/**
 * Test GitHub Publisher
 * Creates a test cycle and publishes to GitHub Pages
 */

import { GitHubPublisher } from './github-publisher/github-publisher.js';
import { CycleGenerator } from './data-generator/cycle-generator.js';
import { AISummarizer } from './data-generator/ai-summarizer.js';
import dotenv from 'dotenv';

dotenv.config();

// Mock test events
const testEvents = [
  {
    id: 'test-001',
    waterCompany: 'Thames Water',
    siteId: 'TWL00391',
    siteName: 'Mogden STW',
    receivingWatercourse: 'River Thames',
    latitude: 51.4567,
    longitude: -0.3421,
    startTime: new Date(Date.now() - (12 * 60 * 60 * 1000)).toISOString(), // 12 hours ago
    endTime: new Date().toISOString(),
    durationMinutes: 720 // 12 hours
  },
  {
    id: 'test-002',
    waterCompany: 'Severn Trent Water',
    siteId: 'SVT01750',
    siteName: 'Hartshay Brook CSO',
    receivingWatercourse: 'THE HARTSHAY BROOK',
    latitude: 53.0618,
    longitude: -1.4117,
    startTime: new Date(Date.now() - (15 * 60 * 60 * 1000)).toISOString(), // 15 hours ago
    endTime: new Date().toISOString(),
    durationMinutes: 900 // 15 hours
  }
];

async function runTest() {
  console.log('='.repeat(70));
  console.log('🧪 GITHUB PUBLISHER TEST');
  console.log('='.repeat(70));

  try {
    // Check environment variables
    const githubUsername = process.env.GITHUB_USERNAME || 'bigchungustm';
    const repoName = process.env.GITHUB_REPO_NAME || 'shitwatch-uk-data';

    console.log(`\n📝 Configuration:`);
    console.log(`   GitHub User: ${githubUsername}`);
    console.log(`   Repository: ${repoName}`);
    console.log(`   URL: https://${githubUsername}.github.io/${repoName}/`);

    // Initialize components
    console.log(`\n🔧 Initializing components...`);
    const githubPublisher = new GitHubPublisher(githubUsername, repoName);
    const aiSummarizer = new AISummarizer();
    const cycleGenerator = new CycleGenerator(githubPublisher, aiSummarizer);

    // Generate test cycle
    console.log(`\n📊 Generating test cycle with ${testEvents.length} events...`);
    const cycleData = await cycleGenerator.generateCycleData(testEvents);

    if (!cycleData.success) {
      console.error('❌ Failed to generate cycle data');
      process.exit(1);
    }

    console.log(`✓ Cycle generated: ${cycleData.filename}`);
    console.log(`✓ Cycle ID: ${cycleData.cycleId}`);

    // Publish to GitHub
    console.log(`\n📤 Publishing to GitHub...`);
    const published = await cycleGenerator.publishToGitHub(cycleData);

    if (!published.success) {
      console.error('❌ Failed to publish to GitHub');
      console.error(`   Error: ${published.error}`);
      process.exit(1);
    }

    console.log(`✓ Published to GitHub!`);

    console.log(`\n✅ TEST COMPLETE!`);
    console.log('='.repeat(70));
    console.log(`\n🌐 Your cycle will be available at:`);
    console.log(`   ${cycleData.url}`);
    console.log(`\n⏱️  GitHub Pages may take 1-2 minutes to update`);
    console.log(`\n📋 Next steps:`);
    console.log(`   1. Visit https://${githubUsername}.github.io/${repoName}/`);
    console.log(`   2. Check the landing page loads`);
    console.log(`   3. Click "View Live Feed" to see the test cycle`);
    console.log(`   4. If working, you're ready to run the full bot!`);
    console.log('='.repeat(70));

  } catch (error) {
    console.error('\n❌ TEST FAILED:');
    console.error(error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

runTest();
