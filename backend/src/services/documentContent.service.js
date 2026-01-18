/**
 * Document Content Service
 *
 * Shared utility for gathering document content for study aid generation.
 */

const prisma = require('../lib/prisma');

// Maximum characters to include in context (roughly ~15-20k tokens)
const MAX_CONTEXT_CHARS = 60000;

/**
 * Gather content from specified documents
 * @param {string[]} documentIds - Documents to gather content from
 * @returns {Promise<{content: string, truncated: boolean, documentCount: number, documentNames: string[]}>}
 */
async function gatherDocumentsContent(documentIds) {
  if (!documentIds || documentIds.length === 0) {
    return { content: '', truncated: false, documentCount: 0, documentNames: [] };
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
    return { content: '', truncated: false, documentCount: 0, documentNames: [] };
  }

  // Group chunks by document for better context
  const docMap = new Map();
  for (const chunk of chunks) {
    const docId = chunk.document.id;
    if (!docMap.has(docId)) {
      docMap.set(docId, {
        name: chunk.document.originalName,
        chunks: [],
      });
    }
    docMap.get(docId).chunks.push(chunk.content);
  }

  // Build content string with document headers
  let content = '';
  let truncated = false;
  const documentNames = [];

  for (const [docId, doc] of docMap) {
    documentNames.push(doc.name);
    const docContent = `\n\n=== ${doc.name} ===\n${doc.chunks.join('\n\n')}`;

    // Check if adding this document would exceed limit
    if (content.length + docContent.length > MAX_CONTEXT_CHARS) {
      truncated = true;
      // Try to add partial content if there's room
      const remaining = MAX_CONTEXT_CHARS - content.length;
      if (remaining > 500) {
        content += docContent.substring(0, remaining) + '\n\n[Content truncated...]';
      }
      break;
    }

    content += docContent;
  }

  return {
    content: content.trim(),
    truncated,
    documentCount: docMap.size,
    documentNames,
  };
}

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
  gatherDocumentsContent,
  gatherDocumentsContentStructured,
  MAX_CONTEXT_CHARS,
};
