/**
 * Summary Routes
 */

const express = require('express');
const { authenticate } = require('../middleware/auth.middleware');
const {
  createSummaryHandler,
  getClassroomSummaries,
  getSummaryHandler,
  deleteSummaryHandler,
  createManualSummaryHandler,
  updateSummaryHandler,  
} = require('../controllers/summary.controller');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Classroom-scoped routes
router.post('/classrooms/:classroomId/summaries', createSummaryHandler);
router.post('/classrooms/:classroomId/summaries/manual', createManualSummaryHandler);
router.get('/classrooms/:classroomId/summaries', getClassroomSummaries);

// Summary routes
router.get('/summaries/:id', getSummaryHandler);
router.put('/summaries/:id', updateSummaryHandler);
router.delete('/summaries/:id', deleteSummaryHandler);

module.exports = router;
