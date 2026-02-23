/**
 * Document Content Service
 *
 * Shared utility for gathering document content.
 * Used by both RAG chat and study aid generation.
 */

const prisma = require('../lib/prisma');

/**
 * Gather content from specified documents in structured format
 * Returns individual documents rather than concatenated string
 * @param {string[]} documentIds - Documents to gather content from
 * @returns {Promise<Array<{id: string, name: string, content: string}>>}
 */
async function gatherDocumentsContentStructured(documentIds) {
  if (!documentIds || documentIds.length === 0) {
    return [];
  }

  // Get chunks from specified documents
  const chunks = await prisma.documentChunk.findMany({
    where: {
      documentId: { in: documentIds },
      document: { status: 'READY' },
    },
    include: {
      document: {
        select: {
          id: true,
          originalName: true,
        },
      },
    },
    orderBy: [
      { documentId: 'asc' },
      { chunkIndex: 'asc' },
    ],
  });

  if (chunks.length === 0) {
    return [];
  }

  // Group chunks by document
  const docMap = new Map();
  for (const chunk of chunks) {
    const docId = chunk.document.id;
    if (!docMap.has(docId)) {
      docMap.set(docId, {
        id: docId,
        name: chunk.document.originalName,
        chunks: [],
      });
    }
    docMap.get(docId).chunks.push(chunk.content);
  }

  // Convert to array of documents with concatenated content
  const documents = [];
  for (const [docId, doc] of docMap) {
    documents.push({
      id: doc.id,
      name: doc.name,
      content: doc.chunks.join('\n\n'),
    });
  }

  return documents;
}

module.exports = {
  gatherDocumentsContentStructured,
};
