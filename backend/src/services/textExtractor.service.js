/**
 * Text Extractor Service
 *
 * Extracts text from PDF, DOCX, TXT, and audio files.
 */

const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const OpenAI = require('openai');
const { env } = require('../config/env');
const llmConfig = require('../config/llm.config');
const logger = require('../config/logger');
const { extractPdf } = require('./extractor.service');

// Initialize OpenAI client for audio transcription (only if API key is provided)
const openai = env.OPENAI_WHISPER_SECRET_KEY
  ? new OpenAI({ apiKey: env.OPENAI_WHISPER_SECRET_KEY })
  : null;

const { isCodeFile } = require('../validators/document.validator');

/**
 * Extract text from a file buffer based on MIME type
 * @param {Buffer} buffer - File content
 * @param {string} mimeType - File MIME type
 * @param {string} [filename] - Original filename (used for code file detection)
 * @returns {Promise<string>} Extracted text
 */
async function extractText(buffer, mimeType, filename) {
  switch (mimeType) {
    case 'application/pdf':
      return extractFromPdf(buffer);

    case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
      return extractFromDocx(buffer);

    case 'text/plain':
      return buffer.toString('utf-8');

    default:
      // Audio is handled by extractTextWithTier (needs duration → cost weighting)
      if (mimeType.startsWith('audio/')) {
        throw new Error('Audio extraction must go through extractTextWithTier');
      }
      // Jupyter notebooks: extract cell sources so embeddings/summaries see
      // meaningful text rather than JSON syntax.
      if (filename && filename.toLowerCase().endsWith('.ipynb')) {
        return extractFromIpynb(buffer);
      }
      // Check if it's a code file — read as plain text
      if (isCodeFile(mimeType, filename)) {
        return buffer.toString('utf-8');
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
 * Extract text from a Jupyter Notebook (.ipynb).
 * Concatenates source from markdown and code cells, labelling code blocks
 * with the notebook's kernel language for downstream LLM context.
 * @param {Buffer} buffer
 * @returns {string}
 */
function extractFromIpynb(buffer) {
  try {
    const nb = JSON.parse(buffer.toString('utf-8'));
    const language =
      nb?.metadata?.kernelspec?.language ||
      nb?.metadata?.language_info?.name ||
      '';
    const cells = Array.isArray(nb.cells) ? nb.cells : [];
    const parts = cells.map((cell) => {
      const source = Array.isArray(cell.source)
        ? cell.source.join('')
        : (cell.source || '');
      if (cell.cell_type === 'code') {
        return '```' + language + '\n' + source + '\n```';
      }
      return source;
    });
    return parts.filter((p) => p && p.trim()).join('\n\n');
  } catch (error) {
    logger.error('IPYNB extraction failed', { error: error.message });
    throw new Error('Failed to extract text from notebook');
  }
}

/**
 * Transcribe audio file using OpenAI Whisper.
 * Uses verbose_json so we get duration back — that's what we bill against the
 * daily quota (Whisper pricing is per-minute, not per-token).
 *
 * @param {Buffer} buffer - Audio file buffer
 * @param {string} mimeType - Audio MIME type
 * @param {string} [tier='PREMIUM'] - User tier (audio is premium-only)
 * @returns {Promise<{text: string, durationSeconds: number, model: string}>}
 */
async function transcribeAudio(buffer, mimeType, tier = 'PREMIUM') {
  if (!openai) {
    throw new Error('Audio transcription is not configured. OPENAI_WHISPER_SECRET_KEY is missing.');
  }

  try {
    const extension = getAudioExtension(mimeType);
    const file = new File([buffer], `audio.${extension}`, { type: mimeType });
    const whisperModel = llmConfig.tiers[tier]?.extraction?.whisper?.primary || 'whisper-1';

    logger.info('Starting audio transcription', { mimeType, size: buffer.length, model: whisperModel });

    const transcription = await openai.audio.transcriptions.create({
      file: file,
      model: whisperModel,
      response_format: 'verbose_json',
    });

    const durationSeconds = transcription.duration || 0;

    logger.info('Audio transcription completed', {
      mimeType,
      model: whisperModel,
      durationSeconds,
      transcriptLength: transcription.text?.length || 0,
    });

    return {
      text: transcription.text || '',
      durationSeconds,
      model: whisperModel,
    };
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

/**
 * Extract text from a file buffer based on MIME type with tier-based extraction
 * @param {Buffer} buffer - File content
 * @param {string} mimeType - File MIME type
 * @param {string} tier - User tier ('FREE' or 'PREMIUM')
 * @param {string} [filename] - Original filename (for code file detection)
 * @returns {Promise<{text: string, tokensUsed: number, weightedTokens: number, extractionMethod: string|null}>}
 */
async function extractTextWithTier(buffer, mimeType, tier, filename) {
  // For PDFs, use tier-based extraction
  if (mimeType === 'application/pdf') {
    return await extractPdf(buffer, { tier });
  }

  // For audio, transcribe and convert duration into "raw tokens" so the
  // model registry's costWeight can scale it into the user's daily budget.
  // Convention: 1 second = 100 raw tokens. With whisper-1 costWeight = 0.33,
  // 1 minute of audio ≈ 6000 raw × 0.33 = ~2000 weighted tokens, which
  // matches Whisper's $0.006/min cost ratio against gpt-4o-mini output.
  if (mimeType.startsWith('audio/')) {
    const { text, durationSeconds, model } = await transcribeAudio(buffer, mimeType, tier);
    const costWeight = llmConfig.models[model]?.costWeight || 0;
    const tokensUsed = Math.ceil(durationSeconds * 100);
    const weightedTokens = Math.ceil(tokensUsed * costWeight);
    return {
      text,
      tokensUsed,
      weightedTokens,
      extractionMethod: 'WHISPER',
    };
  }

  // For other types, use the standard extraction (no tokens used, no extraction method)
  const text = await extractText(buffer, mimeType, filename);
  return {
    text,
    tokensUsed: 0,
    weightedTokens: 0,
    extractionMethod: null,
  };
}

module.exports = {
  extractText,
  extractTextWithTier,
};
