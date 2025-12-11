const express = require("express");
const router = express.Router();

const upload = require("../middleware/uploadMiddleware");
const auth = require("../middleware/authMiddleware");
const { uploadDocument } = require("../controllers/documentController");
// TODO:
// 1. Validate classroom_id ownership in the route before uploadDocument is executed.

router.post("/upload", auth, upload.single("file"), uploadDocument);

module.exports = router;
