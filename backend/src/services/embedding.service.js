/**
 * Embedding Service
 *
 * Generates embeddings using Google Gemini and stores in Pinecone.
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');
const { Pinecone } = require('@pinecone-database/pinecone');
const { env } = require('../config/env');
const logger = require('../config/logger');

// Initialize Gemini
const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
const embeddingModel = genAI.getGenerativeModel({ model: 'text-embedding-004' });

// Initialize Pinecone
const pinecone = new Pinecone({
  apiKey: env.PINECONE_API_KEY,
});

const index = pinecone.index(env.PINECONE_INDEX_NAME);

/**
 * Generate embedding for a single text
 * @param {string} text - Text to embed
 * @returns {Promise<number[]>} Embedding vector
 */
async function generateEmbedding(text) {
  const result = await embeddingModel.embedContent(text);
  return result.embedding.values;
}

/**
 * Generate embeddings for multiple texts (batched)
 * @param {string[]} texts - Array of texts to embed
 * @returns {Promise<number[][]>} Array of embedding vectors
 */
async function generateEmbeddings(texts) {
  const embeddings = [];

  // Process in batches to avoid rate limits
  const batchSize = 5;
  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map((text) => generateEmbedding(text))
    );
    embeddings.push(...batchResults);

    // Small delay between batches to avoid rate limits
    if (i + batchSize < texts.length) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  return embeddings;
}

/**
 * Upsert vectors to Pinecone
 * @param {object[]} vectors - Array of {id, values, metadata}
 */
async function upsertVectors(vectors) {
  // Pinecone has a limit of 100 vectors per upsert
  const batchSize = 100;
  for (let i = 0; i < vectors.length; i += batchSize) {
    const batch = vectors.slice(i, i + batchSize);
    await index.upsert(batch);
    logger.debug(`Upserted ${batch.length} vectors to Pinecone`);
  }
}

/**
 * Delete vectors by document ID (using metadata filter)
 * @param {string} documentId - Document ID
 */
async function deleteVectorsByDocument(documentId) {
  try {
    // Delete by metadata filter
    await index.deleteMany({
      filter: { documentId },
    });
    logger.info(`Deleted vectors for document: ${documentId}`);
  } catch (error) {
    logger.error('Failed to delete vectors from Pinecone', {
      error: error.message,
      documentId,
    });
  }
}

/**
 * Query similar vectors
 * @param {number[]} queryVector - Query embedding
 * @param {object} options - Query options
 * @param {number} options.topK - Number of results (default 5)
 * @param {string} options.classroomId - Filter by classroom
 * @returns {Promise<object[]>} Similar vectors with scores
 */
async function querySimilar(queryVector, options = {}) {
  const { topK = 5, classroomId } = options;

  const queryOptions = {
    vector: queryVector,
    topK,
    includeMetadata: true,
  };

  if (classroomId) {
    queryOptions.filter = { classroomId };
  }

  const result = await index.query(queryOptions);
  return result.matches || [];
}

module.exports = {
  generateEmbedding,
  generateEmbeddings,
  upsertVectors,
  deleteVectorsByDocument,
  querySimilar,
};
