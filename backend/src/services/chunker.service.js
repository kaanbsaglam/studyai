/**
 * Chunker Service
 *
 * Splits text into chunks for embedding and RAG retrieval.
 * Uses word-count based splitting with overlap.
 */

const CHUNK_SIZE = 800;    // Target words per chunk
const CHUNK_OVERLAP = 150; // Words of overlap between chunks

/**
 * Split text into overlapping chunks
 * @param {string} text - Text to chunk
 * @param {object} options - Chunking options
 * @param {number} options.chunkSize - Words per chunk (default 800)
 * @param {number} options.overlap - Words of overlap (default 150)
 * @returns {string[]} Array of text chunks
 */
function chunkText(text, options = {}) {
  const chunkSize = options.chunkSize || CHUNK_SIZE;
  const overlap = options.overlap || CHUNK_OVERLAP;

  // Clean and normalize text
  const cleanedText = text
    .replace(/\r\n/g, '\n')           // Normalize line endings
    .replace(/\n{3,}/g, '\n\n')       // Reduce excessive newlines
    .replace(/[ \t]+/g, ' ')          // Normalize spaces
    .trim();

  if (!cleanedText) {
    return [];
  }

  // Split into words while preserving structure
  const words = cleanedText.split(/\s+/);

  if (words.length <= chunkSize) {
    return [cleanedText];
  }

  const chunks = [];
  let startIndex = 0;

  while (startIndex < words.length) {
    // Calculate end index for this chunk
    const endIndex = Math.min(startIndex + chunkSize, words.length);

    // Get chunk words and join
    const chunkWords = words.slice(startIndex, endIndex);
    const chunk = chunkWords.join(' ');

    chunks.push(chunk);

    // Move start index, accounting for overlap
    startIndex = endIndex - overlap;

    // Prevent infinite loop if overlap >= chunkSize
    if (startIndex <= chunks.length * (chunkSize - overlap) - (chunkSize - overlap)) {
      startIndex = endIndex;
    }
  }

  return chunks;
}

module.exports = {
  chunkText,
  CHUNK_SIZE,
  CHUNK_OVERLAP,
};
