/**
 * Document Processor Service
 * Handles document chunking, cleaning, and metadata extraction
 */

import crypto from 'crypto';

class DocumentProcessor {
  constructor() {
    this.chunkSize = parseInt(process.env.CHUNK_SIZE || '800');
    this.chunkOverlap = parseInt(process.env.CHUNK_OVERLAP || '200');
  }

  /**
   * Process a scraped document into chunks
   * @param {object} scrapedDoc - Scraped document from web scraper
   * @returns {Array<{id: string, title: string, content: string, chunk: number, totalChunks: number, url: string, category: string}>}
   */
  processDocument(scrapedDoc) {
    const { title, content, url, scrapedAt, description } = scrapedDoc;

    // Validate content
    if (!content || content.length < 50) {
      console.warn(`⚠️ Content too short for ${url}, skipping...`);
      return [];
    }

    // Generate base ID from URL
    const baseId = this.generateId(url);
    
    // Chunk the content
    const chunks = this.chunkText(content);
    
    console.log(`📄 Processed "${title}" into ${chunks.length} chunks`);

    // Create document chunks with metadata
    return chunks.map((chunkContent, index) => ({
      id: `${baseId}-chunk-${index}`,
      title: `${title} (Part ${index + 1}/${chunks.length})`,
      content: chunkContent,
      chunk: index,
      totalChunks: chunks.length,
      url,
      category: this.categorizeContent(url, title, content),
      scrapedAt,
      description: index === 0 ? description : '',
      contentHash: this.generateHash(chunkContent)
    }));
  }

  /**
   * Chunk text into overlapping segments
   * @param {string} text - Text to chunk
   * @returns {Array<string>} - Array of text chunks
   */
  chunkText(text) {
    const chunks = [];
    
    // If text is smaller than chunk size, return as single chunk
    if (text.length <= this.chunkSize) {
      return [text];
    }

    let startIndex = 0;
    
    while (startIndex < text.length) {
      let endIndex = startIndex + this.chunkSize;
      
      // If this is not the last chunk, try to break at a sentence boundary
      if (endIndex < text.length) {
        // Look for sentence endings within the chunk
        const chunkText = text.substring(startIndex, endIndex);
        const lastSentenceEnd = Math.max(
          chunkText.lastIndexOf('. '),
          chunkText.lastIndexOf('! '),
          chunkText.lastIndexOf('? '),
          chunkText.lastIndexOf('\n')
        );
        
        // If we found a sentence boundary, use it
        if (lastSentenceEnd > this.chunkSize * 0.5) {
          endIndex = startIndex + lastSentenceEnd + 1;
        }
      }
      
      // Extract chunk
      const chunk = text.substring(startIndex, endIndex).trim();
      if (chunk.length > 0) {
        chunks.push(chunk);
      }
      
      // Move to next chunk with overlap
      startIndex = endIndex - this.chunkOverlap;
      
      // Prevent infinite loop
      if (startIndex <= chunks[chunks.length - 1]?.length && chunks.length > 0) {
        break;
      }
    }
    
    return chunks;
  }

  /**
   * Categorize content based on URL and content
   * @param {string} url - Document URL
   * @param {string} title - Document title
   * @param {string} content - Document content
   * @returns {string} - Category
   */
  categorizeContent(url, title, content) {
    const urlLower = url.toLowerCase();
    const titleLower = title.toLowerCase();
    const contentLower = content.substring(0, 500).toLowerCase();

    // Documentation
    if (urlLower.includes('/docs') || urlLower.includes('/documentation') || 
        titleLower.includes('documentation') || titleLower.includes('guide')) {
      return 'documentation';
    }

    // Blog/Articles
    if (urlLower.includes('/blog') || urlLower.includes('/article') || 
        urlLower.includes('/post') || urlLower.includes('/news')) {
      return 'article';
    }

    // Products
    if (urlLower.includes('/product') || urlLower.includes('/shop') || 
        titleLower.includes('product') || contentLower.includes('price')) {
      return 'product';
    }

    // FAQ
    if (urlLower.includes('/faq') || titleLower.includes('faq') || 
        titleLower.includes('frequently asked')) {
      return 'faq';
    }

    // Support/Help
    if (urlLower.includes('/support') || urlLower.includes('/help') || 
        titleLower.includes('support') || titleLower.includes('help')) {
      return 'support';
    }

    // Default
    return 'general';
  }

  /**
   * Generate unique ID from URL
   * @param {string} url - Source URL
   * @returns {string} - Unique ID
   */
  generateId(url) {
    // Create hash of URL for consistent IDs
    return crypto
      .createHash('md5')
      .update(url)
      .digest('hex')
      .substring(0, 12);
  }

  /**
   * Generate content hash for deduplication
   * @param {string} content - Content to hash
   * @returns {string} - Content hash
   */
  generateHash(content) {
    return crypto
      .createHash('md5')
      .update(content.trim())
      .digest('hex');
  }

  /**
   * Process multiple documents
   * @param {Array} scrapedDocs - Array of scraped documents
   * @returns {Array} - Flattened array of all chunks
   */
  processMultiple(scrapedDocs) {
    const allChunks = [];
    
    for (const doc of scrapedDocs) {
      const chunks = this.processDocument(doc);
      allChunks.push(...chunks);
    }
    
    console.log(`📚 Processed ${scrapedDocs.length} documents into ${allChunks.length} total chunks`);
    
    return allChunks;
  }

  /**
   * Deduplicate chunks by content hash
   * @param {Array} chunks - Array of chunks
   * @returns {Array} - Deduplicated chunks
   */
  deduplicateChunks(chunks) {
    const seen = new Set();
    const deduplicated = [];

    for (const chunk of chunks) {
      if (!seen.has(chunk.contentHash)) {
        seen.add(chunk.contentHash);
        deduplicated.push(chunk);
      } else {
        console.log(`🔄 Skipping duplicate chunk: ${chunk.title}`);
      }
    }

    const removed = chunks.length - deduplicated.length;
    if (removed > 0) {
      console.log(`🗑️ Removed ${removed} duplicate chunks`);
    }

    return deduplicated;
  }
}

// Export singleton instance
export const documentProcessor = new DocumentProcessor();
export default documentProcessor;
