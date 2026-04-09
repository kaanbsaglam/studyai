/**
 * Search Service
 *
 * Hybrid document search combining vector similarity (Pinecone)
 * with keyword matching (ILIKE on chunk content).
 * Returns document IDs ranked by relevance.
 */

const { generateEmbedding, querySimilar } = require('./embedding.service');
const prisma = require('../lib/prisma');
const logger = require('../config/logger');

// Search-specific config
const VECTOR_TOP_K = 20;
const KEYWORD_MAX_RESULTS = 20;
const SIMILARITY_THRESHOLD = 0.6;
const KEYWORD_SCORE = 0.6;
const MAX_DOCUMENT_RESULTS = 10;
const SCORE_DROP_RATIO = 0.6; // Drop results scoring below 60% of the top result

/**
 * Search documents in a classroom using hybrid vector + keyword search.
 *
 * @param {string} query - User search query
 * @param {string} classroomId - Classroom to search within
 * @returns {Promise<Array<{documentId: string, score: number}>>}
 */
async function searchDocuments(query, classroomId) {
  logger.info('Hybrid search', { query, classroomId });

  // Get document IDs in this classroom (only READY ones)
  const classroomDocs = await prisma.document.findMany({
    where: { classroomId, status: 'READY' },
    select: { id: true },
  });
  const classroomDocIds = new Set(classroomDocs.map((d) => d.id));

  if (classroomDocIds.size === 0) {
    return [];
  }

  // Run vector and keyword searches in parallel
  const [vectorResults, keywordResults] = await Promise.all([
    vectorSearch(query, classroomId),
    keywordSearch(query, classroomDocIds),
  ]);

  // Merge results: map documentId -> best score
  const docScores = new Map();

  for (const { documentId, score } of vectorResults) {
    if (classroomDocIds.has(documentId)) {
      const existing = docScores.get(documentId) || 0;
      docScores.set(documentId, Math.max(existing, score));
    }
  }

  for (const { documentId, score } of keywordResults) {
    const existing = docScores.get(documentId) || 0;
    docScores.set(documentId, Math.max(existing, score));
  }

  // Sort by score descending, drop weak results, cap at max
  const sorted = [...docScores.entries()]
    .map(([documentId, score]) => ({ documentId, score }))
    .sort((a, b) => b.score - a.score);

  const topScore = sorted[0]?.score || 0;
  const cutoff = topScore * SCORE_DROP_RATIO;
  const ranked = sorted
    .filter((r) => r.score >= cutoff)
    .slice(0, MAX_DOCUMENT_RESULTS);

  logger.info('Search results', {
    query,
    vectorHits: vectorResults.length,
    keywordHits: keywordResults.length,
    mergedResults: ranked.length,
  });

  return ranked;
}

/**
 * Vector similarity search via Pinecone.
 * Returns document IDs with cosine similarity scores.
 */
async function vectorSearch(query, classroomId) {
  try {
    const queryEmbedding = await generateEmbedding(query);
    const matches = await querySimilar(queryEmbedding, {
      topK: VECTOR_TOP_K,
      classroomId,
    });

    // Group by document, keep best score per document
    const docBest = new Map();
    for (const match of matches) {
      if (match.score < SIMILARITY_THRESHOLD) continue;
      const docId = match.metadata?.documentId;
      if (!docId) continue;
      const existing = docBest.get(docId) || 0;
      docBest.set(docId, Math.max(existing, match.score));
    }

    const results = [...docBest.entries()].map(([documentId, score]) => ({ documentId, score }));
    logger.info('Vector search scores', { results: results.map(r => ({ doc: r.documentId.slice(0, 8), score: r.score.toFixed(3) })) });
    return results;
  } catch (error) {
    logger.error('Vector search failed', { error: error.message });
    return [];
  }
}

/**
 * Keyword search via ILIKE on document chunks.
 * Requires ALL terms to match within the same chunk (AND logic).
 * Returns document IDs with a relevance score based on how many chunks matched.
 */
async function keywordSearch(query, classroomDocIds) {
  try {
    const terms = query.trim().split(/\s+/).filter(Boolean);
    if (terms.length === 0) return [];

    const docIdArray = [...classroomDocIds];
    // ALL terms must appear in the same chunk
    const conditions = terms.map((_, i) => `dc.content ILIKE $${i + 2}`);
    const params = [docIdArray, ...terms.map((t) => `%${t}%`)];

    const results = await prisma.$queryRawUnsafe(
      `SELECT dc.document_id as "documentId", COUNT(*)::int as "matchCount"
       FROM document_chunks dc
       WHERE dc.document_id = ANY($1::text[])
       AND (${conditions.join(' AND ')})
       GROUP BY dc.document_id
       ORDER BY "matchCount" DESC
       LIMIT ${KEYWORD_MAX_RESULTS}`,
      ...params
    );

    if (results.length === 0) return [];

    // Scale score by match count relative to the best result
    const maxMatches = results[0].matchCount;
    return results.map((r) => ({
      documentId: r.documentId,
      score: KEYWORD_SCORE * (r.matchCount / maxMatches),
    }));
  } catch (error) {
    logger.error('Keyword search failed', { error: error.message });
    return [];
  }
}

module.exports = { searchDocuments };
