const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const { 
    generateSummary, saveSummary,
    generateFlashcards, saveFlashcards,
    generateQuiz, saveQuiz // Assuming you added these in the controller
} = require("../controllers/documentLLMController");

router.post("/summary", auth, generateSummary);
router.post("/save-summary", auth, saveSummary);

router.post("/flashcards", auth, generateFlashcards);
router.post("/save-flashcards", auth, saveFlashcards);

router.post("/quiz", auth, generateQuiz);
router.post("/save-quiz", auth, saveQuiz);

module.exports = router;