import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import apiRoutes from './routes/api.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve static files (frontend)
app.use(express.static(join(__dirname, '../public')));

// Request logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
  next();
});

// API Routes
app.use('/api', apiRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'Express RAG API',
    version: '1.0.0',
    description: 'RAG API with Ollama DeepSeek-R1 and HuggingFace embeddings',
    endpoints: {
      'POST /api/chat': 'RAG-powered chat (query with context retrieval)',
      'POST /api/search': 'Semantic search only',
      'POST /api/embed': 'Generate text embeddings',
      'GET /api/documents': 'List all knowledge base documents',
      'GET /api/health': 'Health check and service status'
    },
    documentation: {
      chat: {
        method: 'POST',
        body: { message: 'string', topK: 'number (optional, default: 3)', includeThinking: 'boolean (optional)' }
      },
      search: {
        method: 'POST',
        body: { query: 'string', topK: 'number (optional, default: 5)' }
      },
      embed: {
        method: 'POST',
        body: { text: 'string | string[]' }
      }
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message
  });
});

export default app;
