# ShitWatch UK - Production v1

Real-time sewage discharge monitoring with GitHub Pages integration and Twitter posting.

## Architecture

```
Monitor (every 5min) → Queue (10+ hour events) → Scheduler (every 90min) → Twitter + GitHub Pages
```

### Components

1. **Monitor** - Checks EA API every 5 minutes, tracks events
2. **Event Queue** - Stores 10+ hour events ready for posting
3. **Scheduler** - Posts every 90 minutes (16 posts/day)
4. **Data Generator** - Creates JSON files with AI summaries
5. **GitHub Publisher** - Commits and pushes to GitHub Pages
6. **Twitter Poster** - Posts tweets linking to GitHub Pages

## Setup

### 1. Install Dependencies

```bash
cd production
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env` and add:

```env
# Twitter API Credentials
TWITTER_API_KEY=your_key
TWITTER_API_SECRET=your_secret
TWITTER_ACCESS_TOKEN=your_token
TWITTER_ACCESS_SECRET=your_token_secret

# GitHub Configuration
GITHUB_USERNAME=yourusername
GITHUB_REPO_NAME=shitwatch-uk-data
```

### 3. Setup GitHub Repository

See `GITHUB_SETUP.md` for detailed instructions.

### 4. Run

```bash
npm start
```

## How It Works

### Data Flow

1. **Monitoring (every 5 minutes)**
   - Checks EA API for active discharge events
   - Tracks duration of each event
   - When event ends and duration >= 10 hours, adds to queue

2. **Publishing (every 90 minutes)**
   - Takes all unposted 10+ hour events from queue
   - Generates AI summary of events
   - Creates JSON data file in `website/cycles/`
   - Commits and pushes to GitHub
   - Posts tweet linking to GitHub Pages cycle

3. **GitHub Pages**
   - Landing page: Project info, data sources, top 5 events
   - Feed page: Latest 90-minute cycles with AI summaries
   - Event pages: Detailed spreadsheet-style data

### Tweet Format

```
🚨 Severn Trent dumped sewage for 12h 30m into RIVER TAME

📊 Full details: https://yourusername.github.io/repo/cycles/2025-11-29_14-30.html

@grok What's the environmental impact of this discharge?

#SewageScandal #WaterPollution
```

## Directory Structure

```
production/
├── src/
│   ├── monitor/          # API monitoring & event tracking
│   ├── scheduler/        # 90-min posting scheduler
│   ├── data-generator/   # JSON generation & AI summaries
│   ├── github-publisher/ # Git operations
│   └── social/           # Twitter integration
├── website/              # GitHub Pages site (separate repo)
│   ├── index.html        # Landing page
│   ├── feed.html         # Cycle feed
│   ├── cycles/           # Generated cycle JSON files
│   └── events/           # Individual event pages
├── config/               # Configuration files
├── generated_posts/      # AI-generated post archive
├── data/                 # Event database
└── logs/                 # Application logs
```

## Configuration

### Posting Threshold

Edit `src/scheduler/event-queue.js`:

```javascript
this.minDurationMinutes = 600; // 10 hours (current)
```

### Posting Schedule

Edit `src/scheduler/post-scheduler.js`:

```javascript
this.intervalMinutes = 90; // Posts every 90 minutes
```

## Monitoring

The bot logs all activity to console:

- Event start/end detection
- Queue additions
- 90-minute cycle triggers
- GitHub publishing
- Twitter posting

## Data Sources

- **Environment Agency Real-Time API**: Storm overflow event data
- **Historical Permits**: Flow rate estimates
- **Site Coordinates**: GPS locations from discharge consents

## License

MIT

## Credits

Data provided by Environment Agency under Open Government License.
