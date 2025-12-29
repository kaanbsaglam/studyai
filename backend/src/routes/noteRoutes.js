const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const { getNote, saveNote } = require("../controllers/noteController");

router.get("/:classroomId", auth, getNote);
router.post("/:classroomId", auth, saveNote);

module.exports = router;