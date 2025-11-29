/**
 * AI Summary Generator
 *
 * Generates friendly, informative summaries of discharge events
 * Uses Ollama (qwen3:4b) to create human-readable context
 */

import fetch from 'node-fetch';

export class AISummarizer {
  constructor() {
    this.ollamaUrl = 'http://192.168.1.51:11434';
    this.model = 'qwen3:4b';
  }

  /**
   * Generate summary for a cycle of events
   */
  async generateSummary(events) {
    if (events.length === 0) {
      return {
        text: 'No discharge events in this cycle.',
        confidence: 'high'
      };
    }

    try {
      const prompt = this.buildPrompt(events);

      console.log('🤖 Generating AI summary...');

      const response = await fetch(`${this.ollamaUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.model,
          prompt: prompt,
          stream: false,
          system: 'You are a water quality expert writing brief, factual summaries for the public. Be concise and informative.',
          options: {
            temperature: 0.6,
            max_tokens: 250
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status}`);
      }

      const data = await response.json();
      let summaryText = data.response.trim();

      // Clean up common AI artifacts
      summaryText = summaryText.replace(/^["']|["']$/g, '');
      summaryText = summaryText.replace(/\*\*/g, ''); // Remove markdown bold

      console.log('✓ AI summary generated');

      return {
        text: summaryText,
        confidence: 'high',
        generatedAt: new Date().toISOString()
      };

    } catch (error) {
      console.error('Error generating AI summary:', error.message);

      // Fallback: Generate basic summary
      return this.generateFallbackSummary(events);
    }
  }

  /**
   * Build prompt for AI
   */
  buildPrompt(events) {
    const totalEvents = events.length;
    const companies = [...new Set(events.map(e => e.waterCompany))];
    const totalDuration = events.reduce((sum, e) => sum + e.durationMinutes, 0);
    const avgDuration = (totalDuration / totalEvents / 60).toFixed(1);
    const longestEvent = events.reduce((longest, e) =>
      e.durationMinutes > longest.durationMinutes ? e : longest
    );

    // Build event list
    const eventList = events.map(e => {
      const duration = this.formatDuration(e.durationMinutes);
      return `- ${e.waterCompany}: ${e.receivingWatercourse} (${duration})`;
    }).join('\n');

    const prompt = `Summarize these sewage discharge events for the public in 2-3 sentences. Be factual, clear, and focus on what people need to know.

DATA:
- ${totalEvents} discharge event${totalEvents > 1 ? 's' : ''} detected
- Companies: ${companies.join(', ')}
- Average duration: ${avgDuration} hours
- Longest event: ${this.formatDuration(longestEvent.durationMinutes)}

EVENTS:
${eventList}

Write a brief, informative summary (2-3 sentences) explaining what happened and what it means. Focus on facts only. No speculation.`;

    return prompt;
  }

  /**
   * Generate fallback summary if AI fails
   */
  generateFallbackSummary(events) {
    const totalEvents = events.length;
    const companies = [...new Set(events.map(e => e.waterCompany))];
    const longestEvent = events.reduce((longest, e) =>
      e.durationMinutes > longest.durationMinutes ? e : longest
    );

    const summaryText = `${totalEvents} sewage discharge event${totalEvents > 1 ? 's' : ''} detected from ${companies.join(', ')}. The longest discharge lasted ${this.formatDuration(longestEvent.durationMinutes)} into ${longestEvent.receivingWatercourse}.`;

    return {
      text: summaryText,
      confidence: 'medium',
      generatedAt: new Date().toISOString(),
      fallback: true
    };
  }

  /**
   * Format duration
   */
  formatDuration(minutes) {
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;

    if (days > 0) {
      return remainingHours > 0
        ? `${days} day${days > 1 ? 's' : ''} ${remainingHours} hour${remainingHours > 1 ? 's' : ''}`
        : `${days} day${days > 1 ? 's' : ''}`;
    }

    return `${hours} hour${hours > 1 ? 's' : ''}`;
  }
}
