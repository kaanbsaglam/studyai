/**
 * Document Routes
 *
 * All routes require authentication.
 *
 * POST   /api/v1/classrooms/:classroomId/documents  - Upload document
 * GET    /api/v1/classrooms/:classroomId/documents  - List documents in classroom
 * GET    /api/v1/documents/:id                       - Get single document
 * GET    /api/v1/documents/:id/download              - Get download URL
 * DELETE /api/v1/documents/:id                       - Delete document
 */

const express = require('express');
const multer = require('multer');
const {
  uploadDocument,
  getDocuments,
  getDocument,
  getDownloadUrl,
  deleteDocument,
} = require('../controllers/document.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { MAX_FILE_SIZE } = require('../validators/document.validator');

const router = express.Router();

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
});

// All routes require authentication
router.use(authenticate);

// Classroom-scoped routes
router.post('/classrooms/:classroomId/documents', upload.single('file'), uploadDocument);
router.get('/classrooms/:classroomId/documents', getDocuments);

// Document routes
router.get('/documents/:id', getDocument);
router.get('/documents/:id/download', getDownloadUrl);
router.delete('/documents/:id', deleteDocument);

module.exports = router;
