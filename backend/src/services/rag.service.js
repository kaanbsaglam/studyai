/**
 * RAG Service
 *
 * Retrieval-Augmented Generation for answering questions about documents.
 *
 * New architecture:
 * - Selected documents: Full content sent as primary context
 * - RAG: Supplementary context from all classroom documents
 * - Conversation history: Maintains chat memory
 * - Less restrictive prompts: Allows general knowledge answers
 */

const { generateEmbedding, querySimilar } = require('./embedding.service');
const { generateText } = require('./llm.service');
const { gatherDocumentsContentStructured } = require('./documentContent.service');
const prisma = require('../lib/prisma');
const logger = require('../config/logger');

// Similarity threshold - chunks below this score are considered irrelevant
const SIMILARITY_THRESHOLD = 0.4;
const RAG_TOP_K = 5;

// Maximum characters for contexts
const MAX_RAG_CONTEXT_CHARS = 15000;
const MAX_CONVERSATION_HISTORY = 20;

/**
 * Query documents and generate an answer
 * @param {Object} params
 * @param {string} params.question - User's question
 * @param {string} params.classroomId - Classroom to search in
 * @param {string[]} params.documentIds - Documents to use as full context
 * @param {Array<{role: string, content: string}>} params.conversationHistory - Previous messages
 * @param {string} [params.tier='FREE'] - User tier for model selection
 * @returns {Promise<{answer: string, sources: object[], hasRelevantContext: boolean, tokensUsed: number}>}
 */
async function queryAndAnswer({ question, classroomId, documentIds = [], conversationHistory = [], tier = 'FREE' }) {
  logger.info(`RAG query: "${question}" in classroom ${classroomId}`, {
    selectedDocs: documentIds.length,
    historyLength: conversationHistory.length,
  });

  // Gather all context
  const { selectedDocsContext, selectedDocsSources } = await getSelectedDocumentsContext(documentIds);
  const { ragContext, ragSources } = await getRAGContext(question, classroomId, documentIds);

  // Trim conversation history if too long
  const trimmedHistory = conversationHistory.slice(-MAX_CONVERSATION_HISTORY);

  // Build the prompt
  const prompt = buildPrompt({
    question,
    selectedDocsContext,
    ragContext,
    conversationHistory: trimmedHistory,
  });

  // Generate answer using LLM abstraction
  const { text: answer, tokensUsed } = await generateText(prompt, { tier });

  // Combine sources (selected docs first, then RAG)
  const allSources = [...selectedDocsSources, ...ragSources];

  // Deduplicate sources by documentId
  const seenDocIds = new Set();
  const uniqueSources = allSources.filter((s) => {
    if (seenDocIds.has(s.documentId)) return false;
    seenDocIds.add(s.documentId);
    return true;
  });

  const hasRelevantContext = selectedDocsContext.length > 0 || ragContext.length > 0;

  logger.info(`Generated answer`, {
    tokensUsed,
    sourcesCount: uniqueSources.length,
    hasSelectedDocs: selectedDocsContext.length > 0,
    hasRAGContext: ragContext.length > 0,
  });

  return {
    answer,
    sources: uniqueSources,
    hasRelevantContext,
    tokensUsed,
  };
}

/**
 * Get full content from selected documents
 * Uses the shared document content service for DB fetching
 */
async function getSelectedDocumentsContext(documentIds) {
  if (!documentIds || documentIds.length === 0) {
    return { selectedDocsContext: '', selectedDocsSources: [] };
  }

  const documents = await gatherDocumentsContentStructured(documentIds);

  if (documents.length === 0) {
    return { selectedDocsContext: '', selectedDocsSources: [] };
  }

  // Format into context string
  const contextParts = documents.map(
    (doc) => `### Document: ${doc.name}\n\n${doc.content}`
  );
  const selectedDocsContext = contextParts.join('\n\n---\n\n');

  // Build sources
  const selectedDocsSources = documents.map((doc) => ({
    documentId: doc.id,
    filename: doc.name,
    score: 1.0,
    isSelected: true,
  }));

  logger.info(`Selected documents context: ${documents.length} docs, ${selectedDocsContext.length} chars`);

  return { selectedDocsContext, selectedDocsSources };
}

/**
 * Get supplementary context via RAG
 * Excludes chunks from already-selected documents
 */
async function getRAGContext(question, classroomId, excludeDocumentIds = []) {
  try {
    // Generate embedding for the question
    const queryEmbedding = await generateEmbedding(question);

    // Query Pinecone for similar chunks
    const matches = await querySimilar(queryEmbedding, {
      topK: RAG_TOP_K + excludeDocumentIds.length * 2, // Fetch extra to account for filtering
      classroomId,
    });

    // Filter out chunks from selected documents and below threshold
    const relevantMatches = matches
      .filter((match) => match.score >= SIMILARITY_THRESHOLD)
      .filter((match) => !excludeDocumentIds.includes(match.metadata?.documentId));

    // Take only top K after filtering
    const topMatches = relevantMatches.slice(0, RAG_TOP_K);

    if (topMatches.length === 0) {
      logger.info('No supplementary RAG context found');
      return { ragContext: '', ragSources: [] };
    }

    // Get full chunk content from database
    const chunkIds = topMatches.map((m) => m.id);
    const chunks = await prisma.documentChunk.findMany({
      where: { pineconeId: { in: chunkIds } },
      include: {
        document: {
          select: { id: true, originalName: true },
        },
      },
    });

    const chunkMap = new Map(chunks.map((c) => [c.pineconeId, c]));

    // Build context string
    let contextParts = [];
    let totalLength = 0;

    for (const match of topMatches) {
      const chunk = chunkMap.get(match.id);
      const content = chunk?.content || match.metadata?.text || '';
      const filename = chunk?.document?.originalName || match.metadata?.filename || 'Unknown';

      const part = `[${filename}]: ${content}`;

      if (totalLength + part.length > MAX_RAG_CONTEXT_CHARS) {
        break;
      }

      contextParts.push(part);
      totalLength += part.length;
    }

    const ragContext = contextParts.join('\n\n');

    // Build sources
    const ragSources = topMatches
      .filter((match) => chunkMap.has(match.id))
      .map((match) => {
        const chunk = chunkMap.get(match.id);
        return {
          documentId: chunk.document.id,
          filename: chunk.document.originalName,
          score: match.score,
          chunkIndex: chunk.chunkIndex,
          isSelected: false,
        };
      });

    logger.info(`RAG supplementary context: ${ragSources.length} chunks from ${new Set(ragSources.map(s => s.documentId)).size} docs`);

    return { ragContext, ragSources };
  } catch (error) {
    logger.error('RAG context retrieval failed', { error: error.message });
    return { ragContext: '', ragSources: [] };
  }
}

/**
 * Build the chat prompt
 */
function buildPrompt({ question, selectedDocsContext, ragContext, conversationHistory }) {
  const parts = [];

  // System instruction
  parts.push(`You are a helpful study assistant. You help students understand their study materials and answer their questions.

Guidelines:
- If documents are provided, use them as your primary reference
- You can also use your general knowledge to provide helpful answers
- Be educational and explain concepts clearly
- If you don't know something, say so honestly
- Keep answers focused and relevant to the question`);

  // Selected documents (primary context)
  if (selectedDocsContext) {
    parts.push(`## Study Materials

The following documents have been selected by the student:

${selectedDocsContext}`);
  }

  // RAG supplementary context
  if (ragContext) {
    parts.push(`## Additional Context

Here are some relevant excerpts from other documents in the classroom:

${ragContext}`);
  }

  // Conversation history
  if (conversationHistory.length > 0) {
    const historyText = conversationHistory
      .map((msg) => `${msg.role === 'user' ? 'Student' : 'Assistant'}: ${msg.content}`)
      .join('\n\n');

    parts.push(`## Conversation History

${historyText}`);
  }

  // Current question
  parts.push(`## Current Question

Student: ${question}

Please provide a helpful answer:`);

  return parts.join('\n\n---\n\n');
}

module.exports = {
  queryAndAnswer,
  SIMILARITY_THRESHOLD,
};
