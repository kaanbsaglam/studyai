const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const { askQuestion } = require("../controllers/ragController");
// TODO:
// 1. Add classroom ownership check before calling askQuestion controller.

router.post("/ask", auth, askQuestion);

module.exports = router;
