/**
 * Classroom Routes
 *
 * All routes require authentication.
 *
 * POST   /api/v1/classrooms      - Create classroom
 * GET    /api/v1/classrooms      - List user's classrooms
 * GET    /api/v1/classrooms/:id  - Get single classroom with documents
 * PATCH  /api/v1/classrooms/:id  - Update classroom
 * DELETE /api/v1/classrooms/:id  - Delete classroom
 */

const express = require('express');
const {
  createClassroom,
  getClassrooms,
  getClassroom,
  updateClassroom,
  deleteClassroom,
} = require('../controllers/classroom.controller');
const { authenticate } = require('../middleware/auth.middleware');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

router.post('/', createClassroom);
router.get('/', getClassrooms);
router.get('/:id', getClassroom);
router.patch('/:id', updateClassroom);
router.delete('/:id', deleteClassroom);

module.exports = router;
