# ShitWatch UK - Quick Start Guide

Get up and running in 10 minutes!

## Prerequisites

- Node.js installed
- GitHub account
- Twitter API credentials
- Ollama running with qwen3:4b model

## Step 1: Setup GitHub Pages (5 minutes)

Follow the detailed guide in `GITHUB_SETUP.md`, or quick version:

```bash
cd production/website
git init
git branch -M main
git remote add origin https://github.com/bigchungustm/shitwatch-uk-data.git
git add index.html feed.html styles.css app.js feed.js
git commit -m "Initial commit"
git push -u origin main
```

Then enable GitHub Pages in repository Settings → Pages → main branch → / (root)

## Step 2: Configure Environment (2 minutes)

Edit `production/.env`:

```env
# Twitter API
TWITTER_API_KEY=your_key_here
TWITTER_API_SECRET=your_secret_here
TWITTER_ACCESS_TOKEN=your_token_here
TWITTER_ACCESS_SECRET=your_token_secret_here

# GitHub
GITHUB_USERNAME=bigchungustm
GITHUB_REPO_NAME=shitwatch-uk-data
```

## Step 3: Install Dependencies (1 minute)

```bash
cd production
npm install
```

## Step 4: Test GitHub Publishing (2 minutes)

```bash
npm run test
```

This will:
1. Create a test cycle with 2 fake events
2. Generate AI summary
3. Commit and push to GitHub
4. Show you the URL to check

Wait 1-2 minutes, then visit:
```
https://bigchungustm.github.io/shitwatch-uk-data/
```

You should see the test cycle!

## Step 5: Run the Bot! (30 seconds)

If the test worked:

```bash
npm start
```

The bot will:
- Monitor EA API every 5 minutes
- Track 10+ hour discharge events
- Post to Twitter every 90 minutes
- Update GitHub Pages automatically

## What You'll See

### Console Output

```
==================================================================
⏰ POST SCHEDULER STARTED
==================================================================
📅 Posting every 90 minutes
📊 Target: 16 posts per day
🕐 Next post: 15:30
==================================================================

🔍 Checking Environment Agency API...
  ✓ 50 active discharge events found
  ✓ 3 events added to queue (10+ hours)

==================================================================
⏰ POST CYCLE 1/16
🕐 29 Nov 2025, 15:30:00
==================================================================
📦 Events in queue: 3

📊 Generating GitHub Pages data...
🤖 Generating AI summary...
✓ AI summary generated
✓ Cycle data generated: 2025-11-29_15-30.json
✓ URL: https://bigchungustm.github.io/shitwatch-uk-data/cycles/2025-11-29_15-30.json

📤 Publishing to GitHub...
✓ Git commit: Add cycle 2025-11-29_15-30 (3 events)
✓ Pushed to GitHub

🐦 Posting to Twitter...
Tweet preview:
----------------------------------------------------------------------
🚨 Thames dumped sewage for 12h 30m into RIVER THAMES

📊 Full details: https://bigchungustm.github.io/shitwatch-uk-data/cycles/2025-11-29_15-30.json

@grok What's the environmental impact of this discharge?

#SewageScandal #WaterPollution
----------------------------------------------------------------------
Characters: 235/280

✅ POSTED TO TWITTER!
   Tweet ID: 1234567890
   URL: https://twitter.com/user/status/1234567890
   Posts today: 1/16

🕐 Next cycle: 17:00
==================================================================
```

### GitHub Pages

Your website will update every 90 minutes with:
- Landing page showing top 5 longest events
- Feed page with all cycles (newest first)
- Each cycle has:
  - AI-generated summary
  - Spreadsheet table of events
  - Google Maps links

### Twitter

Every 90 minutes, a new tweet linking to GitHub Pages.

## Monitoring

Leave the bot running! It will:
- Check EA API every 5 minutes
- Post every 90 minutes if there are events
- Auto-commit to GitHub
- Handle rate limits gracefully

## Troubleshooting

### "Git push failed"

Make sure you've set up Personal Access Token (see GITHUB_SETUP.md)

### "Twitter 429 error"

Rate limited. Wait 15 minutes and it will recover automatically.

### "Ollama connection failed"

Check Ollama is running:
```bash
ollama list
```

Should show `qwen3:4b`

### "No events in queue"

Normal! The bot needs to find events lasting 10+ hours. This can take time.
You can lower the threshold temporarily for testing (see README.md)

## File Locations

- **Website files**: `production/website/`
- **Generated cycles**: `production/website/cycles/` (auto-created)
- **Config**: `production/config/`
- **Logs**: Console output (you can redirect to file)

## Stopping the Bot

Press `Ctrl+C` in the terminal.

## Next Steps

1. Monitor the console for activity
2. Check GitHub Pages updates
3. Watch Twitter for posts
4. Adjust threshold if needed (README.md)
5. Customize website text/links (index.html, feed.html)

Enjoy! 🎉
