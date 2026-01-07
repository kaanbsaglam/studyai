/**
 * RAG Service
 *
 * Retrieval-Augmented Generation for answering questions about documents.
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');
const { env } = require('../config/env');
const { generateEmbedding, querySimilar } = require('./embedding.service');
const prisma = require('../lib/prisma');
const logger = require('../config/logger');

// Initialize Gemini for chat
const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
const chatModel = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

// Similarity threshold - chunks below this score are considered irrelevant
const SIMILARITY_THRESHOLD = 0.5;
const TOP_K = 5;

/**
 * Query documents and generate an answer
 * @param {string} question - User's question
 * @param {string} classroomId - Classroom to search in
 * @returns {Promise<{answer: string, sources: object[], hasRelevantContext: boolean, tokensUsed: number}>}
 */
async function queryAndAnswer(question, classroomId) {
  logger.info(`RAG query: "${question}" in classroom ${classroomId}`);

  // Step 1: Generate embedding for the question
  const queryEmbedding = await generateEmbedding(question);

  // Step 2: Query Pinecone for similar chunks
  const matches = await querySimilar(queryEmbedding, {
    topK: TOP_K,
    classroomId,
  });

  // Step 3: Filter by similarity threshold
  const relevantMatches = matches.filter(
    (match) => match.score >= SIMILARITY_THRESHOLD
  );

  logger.info(`Found ${matches.length} matches, ${relevantMatches.length} above threshold`);

  // Step 4: If no relevant matches, answer from general knowledge
  if (relevantMatches.length === 0) {
    logger.info('No relevant documents found, using general knowledge');

    const generalPrompt = buildGeneralPrompt(question);
    const result = await chatModel.generateContent(generalPrompt);
    const answer = result.response.text();

    // Get token usage from response
    const usageMetadata = result.response.usageMetadata;
    const tokensUsed = usageMetadata?.totalTokenCount || 0;

    return {
      answer,
      sources: [],
      hasRelevantContext: false,
      tokensUsed,
    };
  }

  // Step 5: Get chunk content from database for full text
  const chunkIds = relevantMatches.map((m) => m.id);
  const chunks = await prisma.documentChunk.findMany({
    where: {
      pineconeId: { in: chunkIds },
    },
    include: {
      document: {
        select: {
          id: true,
          originalName: true,
        },
      },
    },
  });

  // Create a map for easy lookup
  const chunkMap = new Map(chunks.map((c) => [c.pineconeId, c]));

  // Build context from relevant chunks
  const contextParts = relevantMatches.map((match, index) => {
    const chunk = chunkMap.get(match.id);
    const content = chunk?.content || match.metadata?.text || '';
    const filename = chunk?.document?.originalName || match.metadata?.filename || 'Unknown';
    return `[Source ${index + 1}: ${filename}]\n${content}`;
  });

  const context = contextParts.join('\n\n---\n\n');

  // Step 6: Generate answer using Gemini
  const prompt = buildPrompt(question, context);
  const result = await chatModel.generateContent(prompt);
  const answer = result.response.text();

  // Get token usage from response
  const usageMetadata = result.response.usageMetadata;
  const tokensUsed = usageMetadata?.totalTokenCount || 0;

  // Build sources for citation
  const sources = relevantMatches.map((match) => {
    const chunk = chunkMap.get(match.id);
    return {
      documentId: chunk?.document?.id || match.metadata?.documentId,
      filename: chunk?.document?.originalName || match.metadata?.filename,
      score: match.score,
      chunkIndex: chunk?.chunkIndex ?? match.metadata?.chunkIndex,
    };
  });

  logger.info(`Generated answer with ${sources.length} sources, ${tokensUsed} tokens used`);

  return {
    answer,
    sources,
    hasRelevantContext: true,
    tokensUsed,
  };
}

/**
 * Build the prompt for RAG-based answers (with document context)
 */
function buildPrompt(question, context) {
  return `You are a helpful study assistant. Answer the student's question based on the provided context from their study materials.

IMPORTANT: Do NOT include source citations like "(Source 1)" in your answer. The sources will be displayed separately to the user. Just provide a clean, natural answer.

If the context doesn't fully answer the question, you can supplement with your general knowledge, but prioritize the document content.

Context from study materials:
${context}

Student's question: ${question}

Provide a clear, helpful answer without inline citations:`;
}

/**
 * Build the prompt for general knowledge answers (no document context)
 */
function buildGeneralPrompt(question) {
  return `You are a helpful study assistant. The student is asking a question, but there are no relevant documents in their study materials about this topic.

Answer their question using your general knowledge. Be helpful and educational, but keep your answer concise and focused.

Note: Start your response by briefly mentioning that this answer is from general knowledge, not from their uploaded documents.

Student's question: ${question}

Provide a clear, helpful answer:`;
}

module.exports = {
  queryAndAnswer,
  SIMILARITY_THRESHOLD,
};
