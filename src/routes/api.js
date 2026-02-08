/**
 * API Routes - Express router for RAG endpoints
 */

import express from 'express';
import { ragPipeline } from '../services/ragPipeline.js';
import { embeddingService } from '../services/embeddingService.js';
import { vectorStore } from '../services/vectorStore.js';
import { ollamaService } from '../services/ollamaService.js';
import { indexingService } from '../services/indexingService.js';

const router = express.Router();

/**
 * POST /api/chat
 * RAG-powered chat endpoint
 * Body: { message: string, topK?: number, includeThinking?: boolean }
 */
router.post('/chat', async (req, res) => {
  try {
    const { message, topK = 3, includeThinking = false } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'The "message" field is required and must be a string'
      });
    }

    const result = await ragPipeline.query(message, { topK, includeThinking });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
});

/**
 * POST /api/search
 * Semantic search endpoint (retrieval only, no generation)
 * Body: { query: string, topK?: number }
 */
router.post('/search', async (req, res) => {
  try {
    const { query, topK = 5 } = req.body;

    if (!query || typeof query !== 'string') {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'The "query" field is required and must be a string'
      });
    }

    const results = await ragPipeline.search(query, topK);

    res.json({
      success: true,
      data: {
        query,
        results: results.map(item => ({
          id: item.document.id,
          title: item.document.title,
          content: item.document.content,
          category: item.document.category,
          score: item.score
        })),
        totalResults: results.length
      }
    });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
});

/**
 * POST /api/embed
 * Generate embeddings for text
 * Body: { text: string | string[] }
 */
router.post('/embed', async (req, res) => {
  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'The "text" field is required'
      });
    }

    let embeddings;
    if (Array.isArray(text)) {
      embeddings = await embeddingService.generateEmbeddings(text);
    } else {
      embeddings = await embeddingService.generateEmbedding(text);
    }

    res.json({
      success: true,
      data: {
        embeddings,
        dimension: Array.isArray(embeddings[0]) ? embeddings[0].length : embeddings.length,
        model: process.env.EMBEDDING_MODEL || 'Xenova/all-MiniLM-L6-v2'
      }
    });
  } catch (error) {
    console.error('Embed error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
});

/**
 * GET /api/documents
 * List all knowledge base documents
 */
router.get('/documents', (req, res) => {
  try {
    const documents = vectorStore.getAllDocuments();
    const stats = vectorStore.getStats();

    res.json({
      success: true,
      data: {
        documents,
        stats
      }
    });
  } catch (error) {
    console.error('Documents error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
});

/**
 * POST /api/index/url
 * Index a single URL
 * Body: { url: string }
 */
router.post('/index/url', async (req, res) => {
  try {
    const { url } = req.body;

    if (!url || typeof url !== 'string') {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'The "url" field is required and must be a string'
      });
    }

    const result = await indexingService.indexUrl(url);

    res.json({
      success: result.success,
      data: {
        url,
        chunks: result.chunks,
        errors: result.errors
      }
    });
  } catch (error) {
    console.error('Index URL error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
});

/**
 * POST /api/index/bulk
 * Index multiple URLs
 * Body: { urls: string[] }
 */
router.post('/index/bulk', async (req, res) => {
  try {
    const { urls } = req.body;

    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'The "urls" field is required and must be a non-empty array'
      });
    }

    const results = await indexingService.indexUrls(urls);

    res.json({
      success: true,
      data: results
    });
  } catch (error) {
    console.error('Bulk index error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
});

/**
 * POST /api/index/sitemap
 * Index from sitemap URL
 * Body: { sitemapUrl: string }
 */
router.post('/index/sitemap', async (req, res) => {
  try {
    const { sitemapUrl } = req.body;

    if (!sitemapUrl || typeof sitemapUrl !== 'string') {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'The "sitemapUrl" field is required and must be a string'
      });
    }

    const results = await indexingService.indexSitemap(sitemapUrl);

    res.json({
      success: true,
      data: results
    });
  } catch (error) {
    console.error('Sitemap index error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
});

/**
 * GET /api/index/status
 * Get indexing progress
 */
router.get('/index/status', (req, res) => {
  try {
    const progress = indexingService.getProgress();
    const stats = indexingService.getStats();

    res.json({
      success: true,
      data: {
        progress,
        stats
      }
    });
  } catch (error) {
    console.error('Index status error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
});

/**
 * DELETE /api/documents/:id
 * Remove a document by ID
 */
router.delete('/documents/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const removed = await vectorStore.removeDocument(id);

    if (!removed) {
      return res.status(404).json({
        error: 'Not Found',
        message: `Document with ID "${id}" not found`
      });
    }

    res.json({
      success: true,
      message: `Document "${id}" removed successfully`
    });
  } catch (error) {
    console.error('Delete document error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
});

/**
 * GET /api/health
 * Health check endpoint
 */
router.get('/health', async (req, res) => {
  try {
    const ollamaAvailable = await ollamaService.healthCheck();
    const stats = vectorStore.getStats();

    res.json({
      success: true,
      data: {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        services: {
          vectorStore: {
            indexed: stats.isIndexed,
            documentCount: stats.totalDocuments,
            embeddingDimension: stats.embeddingDimension
          },
          ollama: {
            available: ollamaAvailable,
            ...ollamaService.getModelInfo()
          },
          embedding: {
            model: process.env.EMBEDDING_MODEL || 'Xenova/all-MiniLM-L6-v2'
          }
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
