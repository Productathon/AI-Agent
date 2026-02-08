/**
 * Web Scraper Service
 * Fetches and extracts content from web pages using Cheerio
 */

import axios from 'axios';
import * as cheerio from 'cheerio';

class WebScraper {
  constructor() {
    this.userAgent = process.env.SCRAPER_USER_AGENT || 'Mozilla/5.0 (compatible; RAG-Bot/1.0)';
    this.rateLimitMs = parseInt(process.env.SCRAPER_RATE_LIMIT_MS || '2000');
    this.maxRetries = parseInt(process.env.SCRAPER_MAX_RETRIES || '3');
    this.lastRequestTime = 0;
  }

  /**
   * Scrape content from a URL
   * @param {string} url - URL to scrape
   * @returns {Promise<{title: string, content: string, url: string, scrapedAt: string}>}
   */
  async scrape(url) {
    console.log(`🌐 Scraping: ${url}`);
    
    // Rate limiting
    await this.enforceRateLimit();

    // Retry logic
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const html = await this.fetchHtml(url);
        const extracted = this.extractContent(html, url);
        
        console.log(`✅ Successfully scraped: ${extracted.title || url}`);
        return extracted;
      } catch (error) {
        console.warn(`⚠️ Attempt ${attempt}/${this.maxRetries} failed for ${url}: ${error.message}`);
        
        if (attempt === this.maxRetries) {
          throw new Error(`Failed to scrape ${url} after ${this.maxRetries} attempts: ${error.message}`);
        }
        
        // Exponential backoff
        await this.sleep(1000 * Math.pow(2, attempt));
      }
    }
  }

  /**
   * Fetch HTML from URL
   * @param {string} url - Target URL
   * @returns {Promise<string>} - HTML content
   */
  async fetchHtml(url) {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': this.userAgent,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      },
      timeout: 15000,
      maxRedirects: 5
    });

    return response.data;
  }

  /**
   * Extract main content from HTML
   * @param {string} html - Raw HTML
   * @param {string} url - Source URL
   * @returns {object} - Extracted content
   */
  extractContent(html, url) {
    const $ = cheerio.load(html);
    
    // Remove unwanted elements
    $('script, style, noscript, iframe, nav, header, footer, aside, .advertisement, .ads, .sidebar, .menu, .navigation').remove();
    
    // Extract title
    const title = $('title').text().trim() || 
                  $('h1').first().text().trim() || 
                  $('meta[property="og:title"]').attr('content') || 
                  'Untitled';

    // Try to find main content area
    let content = '';
    
    // Priority selectors for main content
    const contentSelectors = [
      'article',
      'main',
      '[role="main"]',
      '.content',
      '.main-content',
      '.article-content',
      '.post-content',
      '#content',
      '#main',
      'body'
    ];

    for (const selector of contentSelectors) {
      const element = $(selector).first();
      if (element.length) {
        // Remove nested unwanted elements
        element.find('script, style, nav, aside, .advertisement').remove();
        content = element.text();
        
        if (content.trim().length > 100) {
          break;
        }
      }
    }

    // Clean up content
    content = content
      .replace(/\s+/g, ' ')  // Normalize whitespace
      .replace(/\n{3,}/g, '\n\n')  // Normalize newlines
      .trim();

    // Extract metadata
    const description = $('meta[name="description"]').attr('content') || 
                       $('meta[property="og:description"]').attr('content') || 
                       '';

    return {
      title: this.cleanText(title),
      content: this.cleanText(content),
      description: this.cleanText(description),
      url,
      scrapedAt: new Date().toISOString()
    };
  }

  /**
   * Clean extracted text
   * @param {string} text - Raw text
   * @returns {string} - Cleaned text
   */
  cleanText(text) {
    return text
      .replace(/\s+/g, ' ')
      .replace(/\n\s*\n/g, '\n')
      .trim();
  }

  /**
   * Enforce rate limiting between requests
   */
  async enforceRateLimit() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.rateLimitMs) {
      const waitTime = this.rateLimitMs - timeSinceLastRequest;
      await this.sleep(waitTime);
    }
    
    this.lastRequestTime = Date.now();
  }

  /**
   * Sleep for specified milliseconds
   * @param {number} ms - Milliseconds to sleep
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Scrape multiple URLs
   * @param {string[]} urls - Array of URLs
   * @returns {Promise<Array>} - Array of scraped content
   */
  async scrapeMultiple(urls) {
    const results = [];
    const errors = [];

    for (const url of urls) {
      try {
        const content = await this.scrape(url);
        results.push(content);
      } catch (error) {
        console.error(`❌ Failed to scrape ${url}:`, error.message);
        errors.push({ url, error: error.message });
      }
    }

    return { results, errors };
  }
}

// Export singleton instance
export const webScraper = new WebScraper();
export default webScraper;
