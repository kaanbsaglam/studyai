/**
 * Gemini Vision Extractor
 *
 * Multimodal PDF extraction using Google Gemini Vision API.
 * Extracts text and describes visual elements (images, charts, diagrams).
 * This is the primary extractor for PREMIUM tier users.
 *
 * Supports chunking for large PDFs - splits into smaller page ranges,
 * extracts each chunk separately, and concatenates results with page markers.
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');
const { PDFDocument } = require('pdf-lib');
const Extractor = require('./Extractor');
const { env } = require('../config/env');
const extractorConfig = require('../config/extractor.config');
const logger = require('../config/logger');
const { loadPrompt } = require('../prompts/loader');

const EXTRACTION_PROMPT = loadPrompt('extraction/vision');

class GeminiVisionExtractor extends Extractor {
  constructor(config = {}) {
    super(config);

    const apiKey = env.GEMINI_API_KEY;
    if (!apiKey) {
      logger.warn('Gemini API key not configured (GEMINI_API_KEY)');
      this.genAI = null;
    } else {
      this.genAI = new GoogleGenerativeAI(apiKey);
    }

    // Model is now passed via options.model from central llm.config.js
    this.model = null;

    // Chunking configuration
    const chunkingConfig = extractorConfig.visionChunking || {};
    this.chunkingEnabled = chunkingConfig.enabled ?? true;
    this.pagesPerChunk = chunkingConfig.pagesPerChunk || 8;
    this.thresholdPages = chunkingConfig.thresholdPages || 12;
  }

  /**
   * Extract text from PDF using Gemini Vision API
   * For large PDFs, splits into chunks and processes separately.
   * @param {Buffer} buffer - PDF file content
   * @param {object} options - Extraction options
   * @param {string} options.model - Model to use (from central llm.config.js)
   * @returns {Promise<{text: string, tokensUsed: number}>}
   */
  async extract(buffer, options = {}) {
    if (!this.genAI) {
      throw new Error('Gemini Vision extractor is not configured. GEMINI_API_KEY is missing.');
    }

    if (!options.model) {
      throw new Error('GeminiVisionExtractor requires a model name via options.model');
    }

    const model = options.model;
    const costWeight = options.costWeight || 0;

    // Load PDF to get page count
    const pdfDoc = await PDFDocument.load(buffer);
    const totalPages = pdfDoc.getPageCount();

    // Decide whether to chunk
    const shouldChunk = this.chunkingEnabled && totalPages > this.thresholdPages;

    if (shouldChunk) {
      return this._extractWithChunking(buffer, pdfDoc, totalPages, model, costWeight);
    } else {
      return this._extractWholePdf(buffer, model, costWeight);
    }
  }

  /**
   * Extract entire PDF in one API call (for small PDFs)
   * @private
   */
  async _extractWholePdf(buffer, model, costWeight) {
    const startMs = Date.now();
    try {
      const genModel = this.genAI.getGenerativeModel({ model });
      const base64Pdf = buffer.toString('base64');

      const result = await genModel.generateContent([
        {
          inlineData: {
            mimeType: 'application/pdf',
            data: base64Pdf,
          },
        },
        EXTRACTION_PROMPT,
      ]);

      const text = result.response.text();
      const usage = result.response.usageMetadata || {};
      const tokensIn = usage.promptTokenCount || 0;
      const tokensOut = usage.candidatesTokenCount || 0;
      const tokensUsed = usage.totalTokenCount || (tokensIn + tokensOut);
      const weightedTokens = Math.ceil(tokensUsed * (costWeight || 0));

      logger.logLLMCall({
        tag: 'extractor',
        event: 'extraction_call_completed',
        model,
        costWeight,
        tokensIn,
        tokensOut,
        tokensUsed,
        weightedTokens,
        durationMs: Date.now() - startMs,
        textLength: text.length,
      });

      return { text, tokensUsed };
    } catch (error) {
      logger.logEvent('error', {
        tag: 'extractor',
        event: 'extraction_call_failed',
        model,
        error: error.message,
        durationMs: Date.now() - startMs,
      });
      throw error;
    }
  }

  /**
   * Extract PDF in chunks for large documents
   * @private
   */
  async _extractWithChunking(originalBuffer, pdfDoc, totalPages, model, costWeight) {
    const chunks = this._calculateChunks(totalPages);

    logger.logEvent('info', {
      tag: 'extractor',
      event: 'extraction_chunking_started',
      totalPages,
      chunkCount: chunks.length,
      pagesPerChunk: this.pagesPerChunk,
    });

    const results = [];
    let totalTokensUsed = 0;

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];

      try {
        // Extract the page range as a new PDF
        const chunkBuffer = await this._extractPageRange(originalBuffer, chunk.startPage, chunk.endPage);

        // Send to Gemini (emits its own structured log line)
        const { text, tokensUsed } = await this._extractWholePdf(chunkBuffer, model, costWeight);

        // Add page markers and store result
        const markedText = this._addPageMarkers(text, chunk.startPage, chunk.endPage);
        results.push(markedText);
        totalTokensUsed += tokensUsed;
      } catch (error) {
        logger.logEvent('error', {
          tag: 'extractor',
          event: 'extraction_chunk_failed',
          chunkIndex: i + 1,
          startPage: chunk.startPage + 1,
          endPage: chunk.endPage + 1,
          error: error.message,
        });
        // Add error marker for this chunk
        results.push(`\n\n--- Pages ${chunk.startPage + 1}-${chunk.endPage + 1} ---\n[Extraction failed: ${error.message}]\n`);
      }
    }

    const combinedText = results.join('\n');

    logger.logEvent('info', {
      tag: 'extractor',
      event: 'extraction_chunking_completed',
      totalPages,
      chunkCount: chunks.length,
      totalTokensUsed,
      combinedTextLength: combinedText.length,
    });

    return {
      text: combinedText,
      tokensUsed: totalTokensUsed,
    };
  }

  /**
   * Calculate chunk boundaries
   * @private
   * @returns {Array<{startPage: number, endPage: number}>} Array of chunk definitions (0-indexed)
   */
  _calculateChunks(totalPages) {
    const chunks = [];
    for (let start = 0; start < totalPages; start += this.pagesPerChunk) {
      const end = Math.min(start + this.pagesPerChunk - 1, totalPages - 1);
      chunks.push({ startPage: start, endPage: end });
    }
    return chunks;
  }

  /**
   * Extract a range of pages from a PDF into a new PDF buffer
   * @private
   * @param {Buffer} originalBuffer - Original PDF buffer
   * @param {number} startPage - Start page index (0-indexed)
   * @param {number} endPage - End page index (0-indexed, inclusive)
   * @returns {Promise<Buffer>} New PDF buffer containing only the specified pages
   */
  async _extractPageRange(originalBuffer, startPage, endPage) {
    const srcDoc = await PDFDocument.load(originalBuffer);
    const newDoc = await PDFDocument.create();

    // Create array of page indices to copy
    const pageIndices = [];
    for (let i = startPage; i <= endPage; i++) {
      pageIndices.push(i);
    }

    // Copy pages to new document
    const copiedPages = await newDoc.copyPages(srcDoc, pageIndices);
    copiedPages.forEach(page => newDoc.addPage(page));

    // Save as buffer
    const pdfBytes = await newDoc.save();
    return Buffer.from(pdfBytes);
  }

  /**
   * Add page markers to extracted text
   * @private
   */
  _addPageMarkers(text, startPage, endPage) {
    // For single page, use "Page N", for range use "Pages N-M"
    const pageLabel = startPage === endPage
      ? `Page ${startPage + 1}`
      : `Pages ${startPage + 1}-${endPage + 1}`;

    return `\n\n--- ${pageLabel} ---\n\n${text}`;
  }

  getName() {
    return 'gemini-vision';
  }

  getExtractionMethod() {
    return 'VISION';
  }
}

module.exports = GeminiVisionExtractor;
