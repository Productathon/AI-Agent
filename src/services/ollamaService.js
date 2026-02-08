/**
 * Ollama Service - Client for Ollama REST API
 * Handles communication with DeepSeek-R1 model via Ollama
 */

class OllamaService {
  constructor() {
    this.baseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
    this.model = process.env.OLLAMA_MODEL || 'deepseek-v3.1:671b-cloud';
  }

  /**
   * Check if Ollama is running and model is available
   * @returns {Promise<boolean>}
   */
  async healthCheck() {
    try {
      console.log(`Checking Ollama health at ${this.baseUrl}/api/tags...`);
      const response = await fetch(`${this.baseUrl}/api/tags`);
      if (!response.ok) {
        console.error(`Ollama health check failed with status: ${response.status}`);
        return false;
      }
      
      const data = await response.json();
      const models = data.models || [];
      console.log(`Available models: ${models.map(m => m.name).join(', ')}`);
      
      // Check for exact model match or partial match for cloud models
      const modelExists = models.some(m => 
        m.name === this.model || 
        m.model === this.model ||
        m.name.includes(this.model.split(':')[0])
      );
      
      if (!modelExists) {
        console.warn(`Model '${this.model}' not found in available models.`);
      } else {
        console.log(`Model '${this.model}' found!`);
      }
      
      return modelExists;
    } catch (error) {
      console.error(`Ollama health check error: ${error.message}`);
      return false;
    }
  }

  /**
   * Generate a response using the chat endpoint
   * @param {Array<{role: string, content: string}>} messages - Chat messages
   * @param {object} options - Generation options
   * @returns {Promise<string>} - Generated response
   */
  async chat(messages, options = {}) {
    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.model,
        messages,
        stream: false,
        options: {
          temperature: options.temperature || 0.7,
          top_p: options.topP || 0.9,
          ...options
        }
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Ollama API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    return data.message?.content || '';
  }

  /**
   * Generate response with RAG context
   * @param {string} query - User's question
   * @param {Array<{document: object, score: number}>} context - Retrieved documents
   * @returns {Promise<string>} - Generated response
   */
  async generateWithContext(query, context) {
    // Build context string from retrieved documents
    const contextText = context
      .map((item, index) => {
        const doc = item.document;
        return `[Document ${index + 1}: ${doc.title}]\n${doc.content}`;
      })
      .join('\n\n');

    const systemPrompt = `You are a helpful assistant that answers questions based on the provided context. 
Use the information from the context to provide accurate and helpful answers.
If the context doesn't contain relevant information to answer the question, say so politely.
Always be concise and direct in your responses.`;

    const userPrompt = `Context:
${contextText}

---

Question: ${query}

Please provide a helpful answer based on the context above.`;

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ];

    return this.chat(messages);
  }

  /**
   * Simple generate without context (direct LLM query)
   * @param {string} prompt - User prompt
   * @returns {Promise<string>} - Generated response
   */
  async generate(prompt) {
    const messages = [
      { role: 'user', content: prompt }
    ];
    return this.chat(messages);
  }

  /**
   * Get model info
   * @returns {object} - Model configuration
   */
  getModelInfo() {
    return {
      baseUrl: this.baseUrl,
      model: this.model
    };
  }
}

// Export singleton instance
export const ollamaService = new OllamaService();
export default ollamaService;
