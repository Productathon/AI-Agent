/**
 * Embedding Service - HuggingFace transformers.js integration
 * Uses all-MiniLM-L6-v2 for generating semantic embeddings
 */

import { pipeline } from '@xenova/transformers';

class EmbeddingService {
  constructor() {
    this.extractor = null;
    this.modelName = process.env.EMBEDDING_MODEL || 'Xenova/all-MiniLM-L6-v2';
    this.isInitialized = false;
  }

  /**
   * Initialize the embedding model (lazy loading)
   */
  async initialize() {
    if (this.isInitialized) return;
    
    console.log(`🔄 Loading embedding model: ${this.modelName}...`);
    this.extractor = await pipeline('feature-extraction', this.modelName);
    this.isInitialized = true;
    console.log(`✅ Embedding model loaded successfully`);
  }

  /**
   * Generate embedding for a single text
   * @param {string} text - Input text to embed
   * @returns {Promise<number[]>} - Embedding vector
   */
  async generateEmbedding(text) {
    await this.initialize();
    
    const output = await this.extractor(text, { 
      pooling: 'mean', 
      normalize: true 
    });
    
    // Convert tensor to array
    return Array.from(output.data);
  }

  /**
   * Generate embeddings for multiple texts
   * @param {string[]} texts - Array of texts to embed
   * @returns {Promise<number[][]>} - Array of embedding vectors
   */
  async generateEmbeddings(texts) {
    const embeddings = [];
    for (const text of texts) {
      const embedding = await this.generateEmbedding(text);
      embeddings.push(embedding);
    }
    return embeddings;
  }

  /**
   * Calculate cosine similarity between two vectors
   * @param {number[]} a - First vector
   * @param {number[]} b - Second vector
   * @returns {number} - Cosine similarity score (-1 to 1)
   */
  cosineSimilarity(a, b) {
    if (a.length !== b.length) {
      throw new Error('Vectors must have the same dimension');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    if (normA === 0 || normB === 0) return 0;
    
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }
}

// Export singleton instance
export const embeddingService = new EmbeddingService();
export default embeddingService;
