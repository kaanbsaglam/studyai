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
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * Validate uploaded file
 * @param {object} file - Multer file object
 * @returns {{valid: boolean, error?: string}}
 */
function validateFile(file) {
  if (!file) {
    return { valid: false, error: 'No file provided' };
  }

  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    return {
      valid: false,
      error: 'Invalid file type. Allowed: PDF, DOCX, TXT, MP3, WAV, M4A',
    };
  }

  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: 'File too large. Maximum size is 10MB',
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
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE,
};
