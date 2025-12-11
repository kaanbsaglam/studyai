const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const {
    generateSummary,
    generateFlashcards,
    generateQuestions
} = require("../controllers/documentLLMController");
// TODO:
// 1. Add middleware or inline checks to enforce document ownership before routing to controllers.

router.post("/summary", auth, generateSummary);
router.post("/flashcards", auth, generateFlashcards);
router.post("/questions", auth, generateQuestions);

module.exports = router;
