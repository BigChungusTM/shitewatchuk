/**
 * GitHub Publisher
 *
 * Handles git operations for publishing to GitHub Pages
 * Commits and pushes data files to repository
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { fileURLToPath } from 'url';

const execAsync = promisify(exec);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class GitHubPublisher {
  constructor(githubUsername, repoName) {
    this.githubUsername = githubUsername;
    this.repoName = repoName;
    this.websiteDir = path.join(__dirname, '../../website');

    // GitHub Pages URL - for .github.io repo, no repo name in URL
    if (repoName === '.github.io' || repoName === `${githubUsername}.github.io`) {
      this.baseUrl = `https://${githubUsername}.github.io`;
    } else {
      this.baseUrl = `https://${githubUsername}.github.io/${repoName}`;
    }
  }

  /**
   * Get full URL for a file
   */
  getUrl(filepath) {
    return `${this.baseUrl}/${filepath}`;
  }

  /**
   * Add file to git
   */
  async add(filepath) {
    try {
      // Make path relative to website dir
      const relativePath = path.relative(this.websiteDir, filepath);

      const { stdout, stderr } = await execAsync(`git add ${relativePath}`, {
        cwd: this.websiteDir
      });

      if (stderr && !stderr.includes('warning')) {
        console.warn('Git add warning:', stderr);
      }

      return true;
    } catch (error) {
      console.error('Git add error:', error.message);
      throw error;
    }
  }

  /**
   * Commit changes
   */
  async commit(message) {
    try {
      const { stdout, stderr } = await execAsync(`git commit -m "${message}"`, {
        cwd: this.websiteDir
      });

      console.log('✓ Git commit:', message);
      return true;
    } catch (error) {
      // If nothing to commit, that's okay
      if (error.message.includes('nothing to commit')) {
        console.log('ℹ Nothing new to commit');
        return true;
      }

      console.error('Git commit error:', error.message);
      throw error;
    }
  }

  /**
   * Push to GitHub
   */
  async push() {
    try {
      const { stdout, stderr } = await execAsync('git push origin main', {
        cwd: this.websiteDir
      });

      console.log('✓ Pushed to GitHub');

      if (stderr && !stderr.includes('->')) {
        console.warn('Git push info:', stderr);
      }

      return true;
    } catch (error) {
      console.error('Git push error:', error.message);
      throw error;
    }
  }

  /**
   * Initialize git repository (run once)
   */
  async init() {
    try {
      console.log('Initializing Git repository...');

      // Initialize git
      await execAsync('git init', { cwd: this.websiteDir });

      // Add remote
      const remoteUrl = `https://github.com/${this.githubUsername}/${this.repoName}.git`;
      await execAsync(`git remote add origin ${remoteUrl}`, { cwd: this.websiteDir });

      // Set main branch
      await execAsync('git branch -M main', { cwd: this.websiteDir });

      console.log('✓ Git repository initialized');
      console.log(`  Remote: ${remoteUrl}`);

      return true;
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('ℹ Git repository already initialized');
        return true;
      }

      console.error('Git init error:', error.message);
      throw error;
    }
  }

  /**
   * Check git status
   */
  async status() {
    try {
      const { stdout } = await execAsync('git status --short', {
        cwd: this.websiteDir
      });

      return stdout.trim();
    } catch (error) {
      console.error('Git status error:', error.message);
      return 'Error checking status';
    }
  }
}
