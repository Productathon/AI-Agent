/**
 * Vector Store - Persistent vector database for semantic search
 * Stores document embeddings and provides similarity search with file-based persistence
 */

import { embeddingService } from './embeddingService.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class VectorStore {
  constructor() {
    this.documents = [];  // Original documents
    this.embeddings = []; // Corresponding embeddings
    this.isIndexed = false;
    this.storePath = process.env.VECTOR_STORE_PATH || path.join(__dirname, '../../data/vector_store.json');
    this.initialized = false;
  }

  /**
   * Initialize store (load from disk if exists)
   */
  async initialize() {
    if (this.initialized) return;

    try {
      await this.load();
      this.initialized = true;
    } catch (error) {
      console.log('📦 No existing vector store found, starting fresh');
      this.initialized = true;
    }
  }

  /**
   * Index documents by generating their embeddings (incremental)
   * @param {Array<{id: string, title: string, content: string, category: string}>} documents
   */
  async indexDocuments(documents) {
    await this.initialize();

    console.log(`🔄 Indexing ${documents.length} new documents...`);
    
    // Filter out duplicates by ID
    const existingIds = new Set(this.documents.map(d => d.id));
    const newDocs = documents.filter(doc => !existingIds.has(doc.id));

    if (newDocs.length === 0) {
      console.log('⚠️ All documents already indexed, skipping...');
      return;
    }

    console.log(`📝 ${newDocs.length} new documents to index (${documents.length - newDocs.length} duplicates skipped)`);

    // Generate embeddings for new documents
    for (let i = 0; i < newDocs.length; i++) {
      const doc = newDocs[i];
      // Combine title and content for richer embeddings
      const textToEmbed = `${doc.title}. ${doc.content}`;
      const embedding = await embeddingService.generateEmbedding(textToEmbed);
      
      this.documents.push(doc);
      this.embeddings.push(embedding);
      
      console.log(`  📄 Indexed: ${doc.title} (${i + 1}/${newDocs.length})`);
    }

    this.isIndexed = true;
    console.log(`✅ Indexing complete. ${newDocs.length} new documents indexed.`);
    
    // Save to disk
    await this.save();
  }

  /**
   * Search for similar documents using semantic similarity
   * @param {string} query - Search query
   * @param {number} topK - Number of results to return
   * @returns {Promise<Array<{document: object, score: number}>>}
   */
  async search(query, topK = 3) {
    await this.initialize();

    if (!this.isIndexed || this.documents.length === 0) {
      console.warn('⚠️ Vector store is empty. Please index some documents first.');
      return [];
    }

    // Generate embedding for query
    const queryEmbedding = await embeddingService.generateEmbedding(query);

    // Calculate similarity scores for all documents
    const scores = this.embeddings.map((embedding, index) => ({
      index,
      score: embeddingService.cosineSimilarity(queryEmbedding, embedding)
    }));

    // Sort by score (descending) and take top K
    scores.sort((a, b) => b.score - a.score);
    const topResults = scores.slice(0, topK);

    // Return documents with their scores
    return topResults.map(result => ({
      document: this.documents[result.index],
      score: result.score
    }));
  }

  /**
   * Get all indexed documents
   * @returns {Array} - All documents in the store
   */
  getAllDocuments() {
    return this.documents;
  }

  /**
   * Remove document by ID
   * @param {string} id - Document ID to remove
   * @returns {boolean} - True if removed, false if not found
   */
  async removeDocument(id) {
    const index = this.documents.findIndex(doc => doc.id === id);
    
    if (index === -1) {
      return false;
    }

    this.documents.splice(index, 1);
    this.embeddings.splice(index, 1);
    
    await this.save();
    return true;
  }

  /**
   * Clear all documents
   */
  async clear() {
    this.documents = [];
    this.embeddings = [];
    this.isIndexed = false;
    await this.save();
    console.log('🗑️ Cleared all documents from vector store');
  }

  /**
   * Get index statistics
   * @returns {object} - Stats about the vector store
   */
  getStats() {
    return {
      totalDocuments: this.documents.length,
      isIndexed: this.isIndexed,
      embeddingDimension: this.embeddings.length > 0 ? this.embeddings[0].length : 0,
      storePath: this.storePath
    };
  }

  /**
   * Save vector store to disk
   */
  async save() {
    try {
      // Ensure directory exists
      const dir = path.dirname(this.storePath);
      await fs.mkdir(dir, { recursive: true });

      const data = {
        documents: this.documents,
        embeddings: this.embeddings,
        isIndexed: this.isIndexed,
        savedAt: new Date().toISOString(),
        version: '1.0'
      };

      await fs.writeFile(this.storePath, JSON.stringify(data, null, 2));
      console.log(`💾 Vector store saved to ${this.storePath}`);
    } catch (error) {
      console.error(`❌ Failed to save vector store: ${error.message}`);
      throw error;
    }
  }

  /**
   * Load vector store from disk
   */
  async load() {
    try {
      const fileContent = await fs.readFile(this.storePath, 'utf-8');
      const data = JSON.parse(fileContent);

      this.documents = data.documents || [];
      this.embeddings = data.embeddings || [];
      this.isIndexed = data.isIndexed || false;

      console.log(`📂 Loaded ${this.documents.length} documents from ${this.storePath}`);
      console.log(`   Last saved: ${data.savedAt}`);
    } catch (error) {
      if (error.code === 'ENOENT') {
        console.log('📦 No existing vector store found');
      } else {
        console.error(`❌ Failed to load vector store: ${error.message}`);
      }
      throw error;
    }
  }
}

// Export singleton instance
export const vectorStore = new VectorStore();
export default vectorStore;
