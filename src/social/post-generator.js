/**
 * Social Media Post Generator
 * Generates posts about discharge events using Ollama (qwen3:4b)
 */

import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';

export class PostGenerator {
  constructor() {
    this.ollamaUrl = 'http://192.168.1.51:11434';
    this.model = 'qwen3:4b';
    this.postsDir = './generated_posts';
    this.grokConfigPath = './config/grok-engagement.json';

    // Create posts directory if it doesn't exist
    if (!fs.existsSync(this.postsDir)) {
      fs.mkdirSync(this.postsDir, { recursive: true });
    }
  }

  /**
   * Check if Grok engagement is enabled
   */
  isGrokEnabled() {
    try {
      if (fs.existsSync(this.grokConfigPath)) {
        const config = JSON.parse(fs.readFileSync(this.grokConfigPath, 'utf8'));
        return config.enabled === true;
      }
    } catch (error) {
      console.error('Error reading Grok config:', error.message);
    }
    return false;
  }

  /**
   * Generate Grok question using AI based on event context
   */
  async generateGrokQuestion(event, historicalData, volumeText) {
    const durationHours = (event.durationMinutes / 60).toFixed(1);
    const durationDays = (event.durationMinutes / 60 / 24).toFixed(1);

    // Questions relevant to TIME-based impacts (not volume)
    const questions = [
      "What damage can sewage do in this time period?",
      "What's the environmental impact of this discharge?",
      "How does this affect local wildlife?",
      "What should water companies face for this?",
      "What are the health risks from sewage in waterways?",
      "How long does river recovery take after this?"
    ];

    // Pick based on duration
    let selectedQuestion;

    if (event.durationMinutes >= 1440) { // 1+ days
      // Long duration - focus on environmental impact
      const longDurationQuestions = [
        "What's the environmental impact of this discharge?",
        "How long does river recovery take after this?",
        "What damage can sewage do in this time period?"
      ];
      selectedQuestion = longDurationQuestions[Math.floor(Math.random() * longDurationQuestions.length)];
    } else {
      // Shorter duration (6-24 hours) - focus on immediate impact
      const shortDurationQuestions = [
        "What damage can sewage do in this time period?",
        "How does this affect local wildlife?",
        "What are the health risks from sewage in waterways?"
      ];
      selectedQuestion = shortDurationQuestions[Math.floor(Math.random() * shortDurationQuestions.length)];
    }

    return selectedQuestion;
  }

  /**
   * Convert liters to cups of tea (1L = 3 cups)
   */
  litersToCupsOfTea(liters) {
    const cups = Math.round(liters * 3);
    return cups.toLocaleString();
  }

  /**
   * Validate that generated text is actually a tweet
   */
  isValidTweet(text) {
    // Must contain key elements
    const hasSewage = text.toLowerCase().includes('sewage') || text.toLowerCase().includes('dumped');
    const hasLink = text.includes('maps.google.com');
    const hasHashtag = text.includes('#');

    // Must NOT contain these bad patterns
    const hasCode = text.includes('print(') || text.includes('```') || text.includes('def ');
    const hasGreeting = text.toLowerCase().includes('hello!') || text.toLowerCase().includes("i'm here to help");
    const hasExplanation = text.includes('To solve this') || text.includes('### ') || text.includes('Approach');
    const hasPythonKeywords = text.includes('Python program') || text.includes('string output');

    if (hasCode || hasGreeting || hasExplanation || hasPythonKeywords) {
      console.error('❌ INVALID: Contains code, greeting, or explanation');
      return false;
    }

    if (!hasSewage || !hasLink || !hasHashtag) {
      console.error('❌ INVALID: Missing required tweet elements (sewage/link/hashtag)');
      return false;
    }

    return true;
  }

  /**
   * Clean generated text to remove code/explanations
   */
  cleanGeneratedText(text) {
    // Validate first
    if (!this.isValidTweet(text)) {
      console.error('❌ Model generated invalid output. Rejecting.');
      return null;
    }

    // Remove quotes if present
    text = text.replace(/^["']|["']$/g, '');

    // Remove any notes/explanations at the end in parentheses
    text = text.replace(/\(Note:.*?\)\s*$/gis, '');

    // Remove leading/trailing whitespace
    text = text.trim();

    // Final length check
    if (text.length > 280) {
      console.warn(`⚠️  Tweet too long (${text.length} chars). Truncating hashtags...`);
      // Try to shorten by removing extra hashtags
      const lines = text.split('\n');
      if (lines.length > 0) {
        const lastLine = lines[lines.length - 1];
        if (lastLine.includes('#')) {
          // Keep only first 2 hashtags
          const hashtags = lastLine.match(/#\w+/g) || [];
          if (hashtags.length > 2) {
            lines[lines.length - 1] = hashtags.slice(0, 2).join(' ');
            text = lines.join('\n');
          }
        }
      }
    }

    return text.trim();
  }

  /**
   * Format duration for readability (concise)
   */
  formatDuration(minutes) {
    if (minutes < 60) {
      return `${minutes}min`;
    }

    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    if (remainingMinutes === 0) {
      return `${hours}h`;
    }

    // Use short format: "7h 46m" instead of "7 hours 46 minutes"
    return `${hours}h ${remainingMinutes}m`;
  }

  /**
   * Select random hashtags (2-3 only)
   */
  selectHashtags() {
    const hashtags = [
      '#SewageScandal',
      '#EndSewagePollution',
      '#WaterPollution',
      '#StopSewageDumping',
      '#CleanWaterNow'
    ];

    // Randomly select 2-3 hashtags only
    const count = 2 + Math.floor(Math.random() * 2); // 2-3
    const selected = [];
    const shuffled = [...hashtags].sort(() => Math.random() - 0.5);

    for (let i = 0; i < count && i < shuffled.length; i++) {
      selected.push(shuffled[i]);
    }

    return selected.join(' ');
  }

  /**
   * Create prompt for Ollama
   */
  async createPrompt(event, historicalData) {
    const duration = this.formatDuration(event.durationMinutes);
    const startTime = new Date(event.startTime).toLocaleString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    const endTime = new Date(event.endTime).toLocaleString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    let volumeInfo = '';
    if (historicalData && historicalData.has_flow_rate === 'yes') {
      const flowRate = parseFloat(historicalData.estimated_flow_m3_hour);
      const durationHours = event.durationMinutes / 60;
      const volumeM3 = Math.round(durationHours * flowRate);
      const volumeLiters = volumeM3 * 1000;
      const cupsOfTea = this.litersToCupsOfTea(volumeLiters);

      volumeInfo = `Estimated ${volumeLiters.toLocaleString()} liters (approx ${cupsOfTea} cups of tea) discharged.`;
    }

    const hashtags = this.selectHashtags();

    // Create Google Maps link
    const mapsLink = `https://maps.google.com/?q=${event.latitude},${event.longitude}`;

    // Calculate volume if available
    let volumeText = '';
    if (historicalData && historicalData.has_flow_rate === 'yes') {
      const flowRate = parseFloat(historicalData.estimated_flow_m3_hour);
      const durationHours = event.durationMinutes / 60;
      const volumeM3 = Math.round(durationHours * flowRate);
      const volumeLiters = volumeM3 * 1000;
      const cupsOfTea = this.litersToCupsOfTea(volumeLiters);
      volumeText = ` - est. ${volumeLiters.toLocaleString()}L (${cupsOfTea} ☕)`;
    }

    // Check if we should add @Grok question
    const grokEnabled = this.isGrokEnabled();
    let grokQuestion = null;

    if (grokEnabled) {
      grokQuestion = await this.generateGrokQuestion(event, historicalData, volumeText);
      console.log(`   Including @grok question: "${grokQuestion}"`);
    }

    const prompt = `Copy this format EXACTLY with the facts below. Output ONLY the tweet, nothing else.

FORMAT TO COPY:
${event.waterCompany} dumped sewage into ${event.receivingWatercourse} for ${duration}.
${mapsLink}
${grokQuestion ? `@grok ${grokQuestion}` : ''}
${hashtags}

RULES:
- Copy the format above EXACTLY
- NO greetings, NO code, NO explanations
- Just the 4 lines above
- Under 280 characters

OUTPUT THE TWEET NOW:`;

    return prompt;
  }

  /**
   * Generate post using Ollama
   */
  async generatePost(event, historicalData) {
    try {
      const prompt = await this.createPrompt(event, historicalData);

      console.log(`\n📝 Generating social media post for ${event.siteId}...`);

      const response = await fetch(`${this.ollamaUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: this.model,
          prompt: prompt,
          stream: false,
          system: 'You are a tweet writer. Output ONLY the tweet text. Never write code, explanations, or analysis. Just the tweet.',
          options: {
            temperature: 0.6,
            top_p: 0.9,
            max_tokens: 300,
            stop: ['```', '###', 'Approach', 'Solution', 'print(']
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      let generatedText = data.response.trim();

      // Clean up any code/explanations the model might have generated
      generatedText = this.cleanGeneratedText(generatedText);

      // Check if validation failed
      if (!generatedText) {
        console.error('❌ Generated text failed validation. Skipping this post.');
        return {
          success: false,
          error: 'Generated text failed validation (contained code/greeting or missing required elements)'
        };
      }

      // Save to file
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `${timestamp}_${event.waterCompany.replace(/\s+/g, '_')}_${event.siteId}.txt`;
      const filepath = path.join(this.postsDir, filename);

      const fileContent = `DISCHARGE EVENT POST
${'='.repeat(70)}
Generated: ${new Date().toLocaleString()}

WATER COMPANY: ${event.waterCompany}
SITE ID: ${event.siteId}
LOCATION: ${event.latitude}, ${event.longitude}
WATERCOURSE: ${event.receivingWatercourse}
DURATION: ${this.formatDuration(event.durationMinutes)}
STARTED: ${new Date(event.startTime).toLocaleString()}
ENDED: ${new Date(event.endTime).toLocaleString()}

${'='.repeat(70)}
GENERATED POST:
${'='.repeat(70)}

${generatedText}

${'='.repeat(70)}
MODEL: ${this.model}
OLLAMA URL: ${this.ollamaUrl}
${'='.repeat(70)}
`;

      fs.writeFileSync(filepath, fileContent, 'utf8');

      console.log(`✓ Post saved to: ${filename}`);
      console.log(`\nGenerated post preview:`);
      console.log('-'.repeat(70));
      console.log(generatedText);
      console.log('-'.repeat(70));

      return {
        success: true,
        post: generatedText,
        filepath: filepath
      };

    } catch (error) {
      console.error(`❌ Error generating post: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Test connection to Ollama
   */
  async testConnection() {
    try {
      console.log(`Testing connection to Ollama at ${this.ollamaUrl}...`);

      const response = await fetch(`${this.ollamaUrl}/api/tags`);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      const models = data.models || [];
      const hasQwen = models.some(m => m.name.includes('qwen3:4b'));

      console.log(`✓ Connected to Ollama`);
      console.log(`✓ Available models: ${models.map(m => m.name).join(', ')}`);

      if (!hasQwen) {
        console.warn(`⚠️  Model 'qwen3:4b' not found!`);
        console.warn(`   Please run: ollama pull qwen3:4b`);
        return false;
      }

      console.log(`✓ Model 'qwen3:4b' is available`);
      return true;

    } catch (error) {
      console.error(`❌ Cannot connect to Ollama: ${error.message}`);
      console.error(`   Make sure Ollama is running at ${this.ollamaUrl}`);
      return false;
    }
  }
}
