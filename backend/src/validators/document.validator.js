/**
 * Document Validators
 *
 * Validation for document uploads.
 */

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'text/plain',
  // Audio files (premium only - checked in controller)
  'audio/mpeg', // .mp3
  'audio/wav', // .wav
  'audio/x-wav', // .wav (alternative)
  'audio/mp4', // .m4a
  'audio/x-m4a', // .m4a (alternative)
  // Code files — MIME types browsers may send
  'text/javascript', // .js
  'application/javascript', // .js (alternative)
  'text/typescript', // .ts
  'application/x-typescript', // .ts (alternative)
  'text/jsx', // .jsx
  'text/x-python', // .py
  'application/x-python-code', // .py (alternative)
  'text/x-java-source', // .java
  'text/x-csrc', // .c
  'text/x-chdr', // .h
  'text/x-c++src', // .cpp
  'text/x-csharp', // .cs
  'text/x-go', // .go
  'text/x-rust', // .rs
  'text/x-ruby', // .rb
  'text/x-php', // .php
  'application/x-httpd-php', // .php (alternative)
  'text/x-swift', // .swift
  'text/x-kotlin', // .kt
  'text/html', // .html
  'text/css', // .css
  'application/json', // .json
  'application/xml', // .xml
  'text/xml', // .xml (alternative)
  'text/yaml', // .yaml, .yml
  'application/x-yaml', // .yaml (alternative)
  'text/markdown', // .md
  'application/x-sh', // .sh
  'text/x-shellscript', // .sh (alternative)
  'application/sql', // .sql
  'text/x-r', // .r
];

/**
 * Code file extensions that should be accepted regardless of MIME type.
 * Browsers are inconsistent — many code files arrive as text/plain or
 * application/octet-stream, so we use extension-based detection as fallback.
 */
const CODE_FILE_EXTENSIONS = new Set([
  'js', 'mjs', 'cjs', 'jsx',
  'ts', 'tsx',
  'py', 'pyw',
  'java',
  'c', 'h', 'cpp', 'hpp', 'cc', 'cxx',
  'cs',
  'go',
  'rs',
  'rb',
  'php',
  'swift',
  'kt', 'kts',
  'html', 'htm',
  'css', 'scss', 'sass', 'less',
  'json', 'jsonc',
  'xml', 'svg',
  'yaml', 'yml',
  'md', 'markdown',
  'sh', 'bash', 'zsh',
  'sql',
  'r',
  'lua',
  'dart',
  'toml',
  'ini', 'cfg', 'conf',
  'dockerfile',
  'makefile',
  'gradle',
  'cmake',
  'ipynb',
]);

const { maxFileSizeBytes: MAX_FILE_SIZE } = require('../config/document.config');

/**
 * Get the file extension (lowercase, no dot) from a filename
 * @param {string} filename
 * @returns {string}
 */
function getFileExtension(filename) {
  if (!filename) return '';
  const parts = filename.split('.');
  if (parts.length < 2) return '';
  return parts.pop().toLowerCase();
}

/**
 * Check if a file is a code file by MIME type or extension
 * @param {string} mimeType
 * @param {string} [filename] - Original filename for extension check
 * @returns {boolean}
 */
function isCodeFile(mimeType, filename) {
  // Check extension first (most reliable for code files)
  if (filename) {
    const ext = getFileExtension(filename);
    if (CODE_FILE_EXTENSIONS.has(ext)) return true;
  }
  // Check MIME type patterns
  if (mimeType && (
    mimeType.startsWith('text/x-') ||
    mimeType === 'text/javascript' ||
    mimeType === 'application/javascript' ||
    mimeType === 'text/typescript' ||
    mimeType === 'application/x-typescript' ||
    mimeType === 'text/jsx' ||
    mimeType === 'text/css' ||
    mimeType === 'text/html' ||
    mimeType === 'application/json' ||
    mimeType === 'application/xml' ||
    mimeType === 'text/xml' ||
    mimeType === 'text/yaml' ||
    mimeType === 'application/x-yaml' ||
    mimeType === 'text/markdown' ||
    mimeType === 'application/x-sh' ||
    mimeType === 'application/sql' ||
    mimeType === 'application/x-httpd-php' ||
    mimeType === 'application/x-python-code'
  )) return true;
  return false;
}

/**
 * Validate uploaded file
 * @param {object} file - Multer file object
 * @returns {{valid: boolean, error?: string}}
 */
function validateFile(file) {
  if (!file) {
    return { valid: false, error: 'No file provided' };
  }

  // Accept if MIME type is in allowlist or if it's a known code file extension
  const mimeAllowed = ALLOWED_MIME_TYPES.includes(file.mimetype);
  const codeByExtension = isCodeFile(file.mimetype, file.originalname);

  if (!mimeAllowed && !codeByExtension) {
    return {
      valid: false,
      error: 'Invalid file type. Allowed: PDF, DOCX, TXT, code files (.js, .py, .java, etc.), MP3, WAV, M4A',
    };
  }

  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: 'File too large. Maximum size is 50MB',
    };
  }

  return { valid: true };
}

/**
 * Check if a MIME type is an audio file
 * @param {string} mimeType
 * @returns {boolean}
 */
function isAudioFile(mimeType) {
  return mimeType && mimeType.startsWith('audio/');
}

module.exports = {
  validateFile,
  isAudioFile,
  isCodeFile,
  getFileExtension,
  ALLOWED_MIME_TYPES,
  CODE_FILE_EXTENSIONS,
  MAX_FILE_SIZE,
};
