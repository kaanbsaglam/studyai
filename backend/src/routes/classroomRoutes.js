const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const { createClassroom, getClassrooms } = require("../controllers/classroomController");

router.post("/", auth, createClassroom);
router.get("/", auth, getClassrooms);

module.exports = router;
