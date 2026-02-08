/**
 * RAG Pipeline - Orchestrates retrieval and generation
 * Combines semantic search with LLM generation
 */

import { vectorStore } from './vectorStore.js';
import { ollamaService } from './ollamaService.js';

class RAGPipeline {
  constructor() {
    this.defaultTopK = 3;
  }

  /**
   * Detect if query is casual conversation vs knowledge question
   * @param {string} query - User's question
   * @returns {boolean} - True if casual conversation
   */
  isCasualConversation(query) {
    const casualPatterns = [
      /^(hi|hello|hey|sup|yo|greetings?|good\s+(morning|afternoon|evening|day))/i,
      /^(how\s+are\s+you|what'?s\s+up|how'?s\s+it\s+going)/i,
      /^(thanks?|thank\s+you|thx|cheers)/i,
      /^(bye|goodbye|see\s+ya|later|cya)/i,
      /^(ok|okay|cool|nice|great|awesome|sure)/i,
      /^(who\s+are\s+you|what\s+are\s+you|introduce\s+yourself)/i
    ];
    
    const trimmedQuery = query.trim().toLowerCase();
    return casualPatterns.some(pattern => pattern.test(trimmedQuery));
  }

  /**
   * Execute full RAG pipeline with smart routing
   * @param {string} query - User's question
   * @param {object} options - Pipeline options
   * @returns {Promise<object>} - Response with answer and sources
   */
  async query(query, options = {}) {
    const topK = options.topK || this.defaultTopK;
    const includeThinking = options.includeThinking || false;

    // Check if Ollama is available first
    const ollamaAvailable = await ollamaService.healthCheck();
    
    // Detect if this is casual conversation
    const isCasual = this.isCasualConversation(query);
    
    if (isCasual && ollamaAvailable) {
      // For casual conversation, just use LLM directly without RAG
      console.log(`💬 Casual conversation detected, using direct LLM response`);
      const response = await ollamaService.generate(query);
      
      return {
        answer: response,
        thinking: undefined,
        sources: [],
        metadata: {
          generationMethod: 'direct-llm',
          documentsRetrieved: 0,
          model: ollamaService.getModelInfo().model,
          queryType: 'casual'
        }
      };
    }

    // For knowledge questions, proceed with RAG
    console.log(`🔍 Knowledge query detected, searching for relevant documents...`);
    const retrievedDocs = await vectorStore.search(query, topK);

    console.log(`📚 Found ${retrievedDocs.length} documents`);
    retrievedDocs.forEach((item, i) => {
      console.log(`  ${i + 1}. ${item.document.title} (score: ${item.score.toFixed(4)})`);
    });

    // Check if retrieved documents are actually relevant (threshold: 0.3)
    const relevantDocs = retrievedDocs.filter(doc => doc.score > 0.3);
    
    let response;
    let generationMethod;
    let usedDocs = retrievedDocs;

    if (relevantDocs.length === 0 && ollamaAvailable) {
      // No relevant docs found, just let LLM answer without context
      console.log(`⚠️ No relevant documents found (all scores < 0.3), using direct LLM`);
      response = await ollamaService.generate(query);
      generationMethod = 'direct-llm';
      usedDocs = [];
    } else if (ollamaAvailable) {
      // Use RAG with relevant documents
      console.log(`🤖 Generating response with RAG (${relevantDocs.length} relevant docs)...`);
      response = await ollamaService.generateWithContext(query, relevantDocs);
      generationMethod = 'rag';
      usedDocs = relevantDocs;
    } else {
      // Fallback when Ollama not available
      console.log(`⚠️ Ollama not available, using fallback response`);
      response = this.generateFallbackResponse(query, retrievedDocs);
      generationMethod = 'fallback';
    }

    // Parse thinking tags if present
    let thinking = null;
    let cleanResponse = response;

    if (response.includes('<think>') && response.includes('</think>')) {
      const thinkMatch = response.match(/<think>([\s\S]*?)<\/think>/);
      if (thinkMatch) {
        thinking = thinkMatch[1].trim();
        cleanResponse = response.replace(/<think>[\s\S]*?<\/think>/, '').trim();
      }
    }

    return {
      answer: cleanResponse,
      thinking: includeThinking ? thinking : undefined,
      sources: usedDocs.map(item => ({
        id: item.document.id,
        title: item.document.title,
        category: item.document.category,
        url: item.document.url,
        relevanceScore: item.score
      })),
      metadata: {
        generationMethod,
        documentsRetrieved: usedDocs.length,
        model: ollamaService.getModelInfo().model,
        queryType: isCasual ? 'casual' : 'knowledge'
      }
    };
  }

  /**
   * Generate fallback response when Ollama is unavailable
   * @param {string} query - User's question
   * @param {Array} retrievedDocs - Retrieved documents
   * @returns {string} - Fallback response
   */
  generateFallbackResponse(query, retrievedDocs) {
    if (retrievedDocs.length === 0) {
      return "I couldn't find any relevant information to answer your question.";
    }

    const topDoc = retrievedDocs[0].document;
    return `Based on the available information:\n\n**${topDoc.title}**\n\n${topDoc.content}\n\n*Note: This is a direct excerpt from our knowledge base. For a more detailed response, please ensure Ollama is running with the DeepSeek-R1 model.*`;
  }

  /**
   * Semantic search only (without generation)
   * @param {string} query - Search query
   * @param {number} topK - Number of results
   * @returns {Promise<Array>} - Search results
   */
  async search(query, topK = 5) {
    return vectorStore.search(query, topK);
  }
}

// Export singleton instance
export const ragPipeline = new RAGPipeline();
export default ragPipeline;
