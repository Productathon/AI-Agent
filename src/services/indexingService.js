/**
 * Indexing Service
 * Orchestrates the scraping → processing → embedding → storage pipeline
 */

import { webScraper } from './webScraper.js';
import { documentProcessor } from './documentProcessor.js';
import { vectorStore } from './vectorStore.js';

class IndexingService {
  constructor() {
    this.isIndexing = false;
    this.currentProgress = {
      status: 'idle',
      totalUrls: 0,
      processedUrls: 0,
      totalChunks: 0,
      errors: []
    };
  }

  /**
   * Index a single URL
   * @param {string} url - URL to index
   * @returns {Promise<{success: boolean, chunks: number, errors: Array}>}
   */
  async indexUrl(url) {
    console.log(`\n🚀 Starting indexing for: ${url}`);
    
    try {
      // Step 1: Scrape content
      const scrapedDoc = await webScraper.scrape(url);
      
      // Step 2: Process into chunks
      const chunks = documentProcessor.processDocument(scrapedDoc);
      
      if (chunks.length === 0) {
        return {
          success: false,
          chunks: 0,
          errors: ['No content extracted from URL']
        };
      }
      
      // Step 3: Index chunks in vector store
      await vectorStore.indexDocuments(chunks);
      
      console.log(`✅ Successfully indexed ${chunks.length} chunks from ${url}\n`);
      
      return {
        success: true,
        chunks: chunks.length,
        errors: []
      };
    } catch (error) {
      console.error(`❌ Failed to index ${url}:`, error.message);
      return {
        success: false,
        chunks: 0,
        errors: [error.message]
      };
    }
  }

  /**
   * Index multiple URLs
   * @param {string[]} urls - Array of URLs to index
   * @returns {Promise<{successful: number, failed: number, totalChunks: number, errors: Array}>}
   */
  async indexUrls(urls) {
    if (this.isIndexing) {
      throw new Error('Indexing already in progress');
    }

    this.isIndexing = true;
    this.currentProgress = {
      status: 'running',
      totalUrls: urls.length,
      processedUrls: 0,
      totalChunks: 0,
      errors: []
    };

    console.log(`\n📚 Starting bulk indexing of ${urls.length} URLs...\n`);

    const results = {
      successful: 0,
      failed: 0,
      totalChunks: 0,
      errors: []
    };

    for (const url of urls) {
      try {
        const result = await this.indexUrl(url);
        
        if (result.success) {
          results.successful++;
          results.totalChunks += result.chunks;
        } else {
          results.failed++;
          results.errors.push({ url, errors: result.errors });
        }
      } catch (error) {
        results.failed++;
        results.errors.push({ url, errors: [error.message] });
      }

      this.currentProgress.processedUrls++;
      this.currentProgress.totalChunks = results.totalChunks;
    }

    this.currentProgress.status = 'completed';
    this.currentProgress.errors = results.errors;
    this.isIndexing = false;

    console.log(`\n✅ Bulk indexing complete!`);
    console.log(`   ✓ Successful: ${results.successful}/${urls.length}`);
    console.log(`   ✗ Failed: ${results.failed}/${urls.length}`);
    console.log(`   📄 Total chunks: ${results.totalChunks}\n`);

    return results;
  }

  /**
   * Index from a sitemap URL
   * @param {string} sitemapUrl - URL of sitemap.xml
   * @returns {Promise<object>} - Indexing results
   */
  async indexSitemap(sitemapUrl) {
    console.log(`🗺️ Fetching sitemap: ${sitemapUrl}`);
    
    try {
      const urls = await this.parseSitemap(sitemapUrl);
      console.log(`📍 Found ${urls.length} URLs in sitemap`);
      
      return await this.indexUrls(urls);
    } catch (error) {
      throw new Error(`Failed to process sitemap: ${error.message}`);
    }
  }

  /**
   * Parse sitemap XML to extract URLs
   * @param {string} sitemapUrl - Sitemap URL
   * @returns {Promise<string[]>} - Array of URLs
   */
  async parseSitemap(sitemapUrl) {
    const html = await webScraper.fetchHtml(sitemapUrl);
    
    // Simple regex to extract URLs from sitemap
    const urlMatches = html.matchAll(/<loc>(.*?)<\/loc>/g);
    const urls = Array.from(urlMatches, match => match[1]);
    
    return urls;
  }

  /**
   * Get current indexing progress
   * @returns {object} - Progress information
   */
  getProgress() {
    return {
      ...this.currentProgress,
      percentage: this.currentProgress.totalUrls > 0 
        ? Math.round((this.currentProgress.processedUrls / this.currentProgress.totalUrls) * 100)
        : 0
    };
  }

  /**
   * Remove documents by URL
   * @param {string} url - URL to remove
   * @returns {number} - Number of documents removed
   */
  removeByUrl(url) {
    const allDocs = vectorStore.getAllDocuments();
    const toRemove = allDocs.filter(doc => doc.url === url);
    
    for (const doc of toRemove) {
      vectorStore.removeDocument(doc.id);
    }
    
    console.log(`🗑️ Removed ${toRemove.length} chunks from ${url}`);
    return toRemove.length;
  }

  /**
   * Get indexing statistics
   * @returns {object} - Statistics
   */
  getStats() {
    const storeStats = vectorStore.getStats();
    const allDocs = vectorStore.getAllDocuments();
    
    // Count unique URLs
    const uniqueUrls = new Set(allDocs.map(doc => doc.url)).size;
    
    // Count by category
    const byCategory = {};
    for (const doc of allDocs) {
      byCategory[doc.category] = (byCategory[doc.category] || 0) + 1;
    }
    
    return {
      ...storeStats,
      uniqueUrls,
      byCategory,
      isIndexing: this.isIndexing
    };
  }
}

// Export singleton instance
export const indexingService = new IndexingService();
export default indexingService;
