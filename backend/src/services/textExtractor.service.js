/**
 * Text Extractor Service
 *
 * Extracts text from PDF, DOCX, TXT, and audio files.
 */

const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const OpenAI = require('openai');
const { env } = require('../config/env');
const logger = require('../config/logger');

// Initialize OpenAI client for audio transcription (only if API key is provided)
const openai = env.OPENAI_SECRET_KEY
  ? new OpenAI({ apiKey: env.OPENAI_SECRET_KEY })
  : null;

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
      // Check if it's an audio file
      if (mimeType.startsWith('audio/')) {
        return transcribeAudio(buffer, mimeType);
      }
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

/**
 * Transcribe audio file using OpenAI Whisper
 * @param {Buffer} buffer - Audio file buffer
 * @param {string} mimeType - Audio MIME type
 * @returns {Promise<string>} Transcribed text
 */
async function transcribeAudio(buffer, mimeType) {
  if (!openai) {
    throw new Error('Audio transcription is not configured. OPENAI_SECRET_KEY is missing.');
  }

  try {
    const extension = getAudioExtension(mimeType);
    const file = new File([buffer], `audio.${extension}`, { type: mimeType });

    logger.info('Starting audio transcription', { mimeType, size: buffer.length });

    const transcription = await openai.audio.transcriptions.create({
      file: file,
      model: 'whisper-1',
      response_format: 'text',
    });

    logger.info('Audio transcription completed', {
      mimeType,
      transcriptLength: transcription.length
    });

    return transcription;
  } catch (error) {
    logger.error('Audio transcription failed', { error: error.message });
    throw new Error('Failed to transcribe audio file');
  }
}

/**
 * Get file extension from audio MIME type
 * @param {string} mimeType
 * @returns {string}
 */
function getAudioExtension(mimeType) {
  const map = {
    'audio/mpeg': 'mp3',
    'audio/wav': 'wav',
    'audio/x-wav': 'wav',
    'audio/mp4': 'm4a',
    'audio/x-m4a': 'm4a',
  };
  return map[mimeType] || 'mp3';
}

module.exports = {
  extractText,
};
