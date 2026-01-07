/**
 * Text Extractor Service
 *
 * Extracts text from PDF, DOCX, and TXT files.
 */

const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const logger = require('../config/logger');

/**
 * Extract text from a file buffer based on MIME type
 * @param {Buffer} buffer - File content
 * @param {string} mimeType - File MIME type
 * @returns {Promise<string>} Extracted text
 */
async function extractText(buffer, mimeType) {
  switch (mimeType) {
    case 'application/pdf':
      return extractFromPdf(buffer);

    case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
      return extractFromDocx(buffer);

    case 'text/plain':
      return buffer.toString('utf-8');

    default:
      throw new Error(`Unsupported file type: ${mimeType}`);
  }
}

/**
 * Extract text from PDF
 * @param {Buffer} buffer
 * @returns {Promise<string>}
 */
async function extractFromPdf(buffer) {
  try {
    const data = await pdfParse(buffer);
    return data.text;
  } catch (error) {
    logger.error('PDF extraction failed', { error: error.message });
    throw new Error('Failed to extract text from PDF');
  }
}

/**
 * Extract text from DOCX
 * @param {Buffer} buffer
 * @returns {Promise<string>}
 */
async function extractFromDocx(buffer) {
  try {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  } catch (error) {
    logger.error('DOCX extraction failed', { error: error.message });
    throw new Error('Failed to extract text from DOCX');
  }
}

module.exports = {
  extractText,
};
