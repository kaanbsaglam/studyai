/**
 * Note Validators
 */

const { z } = require('zod');

const AUDIO_MIME_TYPES = [
  'audio/mpeg', // .mp3
  'audio/wav', // .wav
  'audio/x-wav', // .wav (alternative)
  'audio/mp4', // .m4a
  'audio/x-m4a', // .m4a (alternative)
  'audio/ogg', // .ogg
  'audio/webm', // .webm
];

const MAX_AUDIO_NOTE_SIZE = 25 * 1024 * 1024; // 25MB

function validateAudioNoteFile(file) {
  if (!file) {
    return { valid: false, error: 'No audio file provided' };
  }
  const isAudio =
    (file.mimetype && file.mimetype.startsWith('audio/')) ||
    AUDIO_MIME_TYPES.includes(file.mimetype);
  if (!isAudio) {
    return {
      valid: false,
      error: 'Invalid file type. Audio notes must be MP3, WAV, M4A, OGG, or WebM',
    };
  }
  if (file.size > MAX_AUDIO_NOTE_SIZE) {
    return { valid: false, error: 'Audio file too large. Maximum size is 25MB' };
  }
  return { valid: true };
}

const createNoteSchema = z.object({
  title: z
    .string({ required_error: 'Title is required' })
    .min(1, 'Title cannot be empty')
    .max(200, 'Title is too long'),
  content: z
    .string()
    .max(50000, 'Content is too long')
    .optional()
    .default(''),
  documentId: z
    .string()
    .uuid('Invalid document ID')
    .optional()
    .nullable(),
});

const updateNoteSchema = z.object({
  title: z
    .string()
    .min(1, 'Title cannot be empty')
    .max(200, 'Title is too long')
    .optional(),
  content: z
    .string()
    .max(50000, 'Content is too long')
    .optional(),
});

module.exports = {
  createNoteSchema,
  updateNoteSchema,
  validateAudioNoteFile,
  AUDIO_MIME_TYPES,
  MAX_AUDIO_NOTE_SIZE,
};
