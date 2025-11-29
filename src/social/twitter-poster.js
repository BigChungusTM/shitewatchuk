/**
 * Twitter/X Poster
 *
 * Posts sewage discharge alerts to Twitter/X
 * Uses Twitter API v2 with much simpler authentication than Facebook
 */

import { TwitterApi } from 'twitter-api-v2';
import dotenv from 'dotenv';

dotenv.config();

export class TwitterPoster {
  constructor() {
    // Twitter API credentials
    this.apiKey = process.env.TWITTER_API_KEY;
    this.apiSecret = process.env.TWITTER_API_SECRET;
    this.accessToken = process.env.TWITTER_ACCESS_TOKEN;
    this.accessSecret = process.env.TWITTER_ACCESS_SECRET;

    this.client = null;
    this.isConfigured = this.checkConfiguration();
  }

  /**
   * Check if Twitter credentials are configured
   */
  checkConfiguration() {
    if (!this.apiKey || !this.apiSecret || !this.accessToken || !this.accessSecret) {
      console.error('❌ Twitter not configured');
      console.error('   Please set Twitter credentials in .env:');
      console.error('   TWITTER_API_KEY, TWITTER_API_SECRET');
      console.error('   TWITTER_ACCESS_TOKEN, TWITTER_ACCESS_SECRET');
      return false;
    }

    // Initialize Twitter client
    this.client = new TwitterApi({
      appKey: this.apiKey,
      appSecret: this.apiSecret,
      accessToken: this.accessToken,
      accessSecret: this.accessSecret,
    });

    return true;
  }

  /**
   * Test Twitter connection
   */
  async testConnection() {
    if (!this.isConfigured) {
      return false;
    }

    try {
      const me = await this.client.v2.me();
      console.log(`✓ Connected to Twitter as @${me.data.username}`);
      console.log(`✓ Account: ${me.data.name}`);
      return true;
    } catch (error) {
      console.error('❌ Twitter connection failed:', error.message);
      return false;
    }
  }

  /**
   * Post a tweet
   */
  async tweet(text) {
    if (!this.isConfigured) {
      throw new Error('Twitter not configured');
    }

    // Twitter has 280 character limit (or 4000 for Twitter Blue)
    // We'll aim for 280 to be safe
    if (text.length > 280) {
      console.warn(`⚠️  Tweet is ${text.length} chars (max 280). Truncating...`);
      text = text.substring(0, 277) + '...';
    }

    try {
      const tweet = await this.client.v2.tweet(text);
      console.log(`✓ Posted tweet! ID: ${tweet.data.id}`);

      return {
        success: true,
        tweetId: tweet.data.id,
        url: `https://twitter.com/user/status/${tweet.data.id}`
      };

    } catch (error) {
      console.error('❌ Failed to post tweet:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Post a thread (for longer content)
   */
  async tweetThread(texts) {
    if (!this.isConfigured) {
      throw new Error('Twitter not configured');
    }

    try {
      const tweets = [];
      let previousTweetId = null;

      for (let i = 0; i < texts.length; i++) {
        const text = texts[i];

        const options = previousTweetId
          ? { reply: { in_reply_to_tweet_id: previousTweetId } }
          : {};

        const tweet = await this.client.v2.tweet(text, options);
        tweets.push(tweet.data);
        previousTweetId = tweet.data.id;

        console.log(`✓ Posted tweet ${i + 1}/${texts.length}`);
      }

      return {
        success: true,
        tweets,
        threadUrl: `https://twitter.com/user/status/${tweets[0].id}`
      };

    } catch (error) {
      console.error('❌ Failed to post thread:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get recent tweets from your account
   */
  async getRecentTweets(limit = 10) {
    if (!this.isConfigured) {
      throw new Error('Twitter not configured');
    }

    try {
      const me = await this.client.v2.me();
      const tweets = await this.client.v2.userTimeline(me.data.id, {
        max_results: limit,
        'tweet.fields': ['created_at', 'public_metrics']
      });

      return {
        success: true,
        tweets: tweets.data.data
      };

    } catch (error) {
      console.error('❌ Failed to get tweets:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Delete a tweet
   */
  async deleteTweet(tweetId) {
    if (!this.isConfigured) {
      throw new Error('Twitter not configured');
    }

    try {
      await this.client.v2.deleteTweet(tweetId);
      console.log(`✓ Deleted tweet: ${tweetId}`);

      return { success: true };

    } catch (error) {
      console.error('❌ Failed to delete tweet:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }
}
