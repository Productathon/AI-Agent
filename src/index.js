/**
 * Server Entry Point
 * Initializes the vector store and starts the Express server
 */

import 'dotenv/config';
import app from './app.js';
import { vectorStore } from './services/vectorStore.js';
import { knowledgeBase } from './data/knowledgeBase.js';
import { ollamaService } from './services/ollamaService.js';

const PORT = process.env.PORT || 3000;

async function startServer() {
  console.log('🚀 Starting Express RAG API...\n');

  try {
    // Step 1: Index the knowledge base
    console.log('📚 Initializing knowledge base...');
    await vectorStore.indexDocuments(knowledgeBase);
    console.log('');

    // Step 2: Check Ollama availability
    console.log('🤖 Checking Ollama service...');
    const ollamaAvailable = await ollamaService.healthCheck();
    const modelInfo = ollamaService.getModelInfo();
    
    if (ollamaAvailable) {
      console.log(`✅ Ollama is running with model: ${modelInfo.model}`);
    } else {
      console.log(`⚠️  Ollama not available at ${modelInfo.baseUrl}`);
      console.log(`   To enable full RAG capabilities, run:`);
      console.log(`   $ ollama pull ${modelInfo.model}`);
      console.log(`   $ ollama serve`);
      console.log(`   The API will work with search/embeddings, but chat will use fallback mode.`);
    }
    console.log('');

    // Step 3: Start the server
    app.listen(PORT, () => {
      console.log('═'.repeat(60));
      console.log(`\n✨ Express RAG API is running!\n`);
      console.log(`   Local:   http://localhost:${PORT}`);
      console.log(`   Health:  http://localhost:${PORT}/api/health`);
      console.log(`\n   Available endpoints:`);
      console.log(`   • POST /api/chat    - RAG-powered chat`);
      console.log(`   • POST /api/search  - Semantic search`);
      console.log(`   • POST /api/embed   - Generate embeddings`);
      console.log(`   • GET  /api/documents - List knowledge base\n`);
      console.log('═'.repeat(60));
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n👋 Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n\n👋 Received SIGTERM, shutting down...');
  process.exit(0);
});

// Start the server
startServer();
