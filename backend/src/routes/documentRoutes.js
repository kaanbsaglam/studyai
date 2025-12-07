const express = require("express");
const router = express.Router();

const upload = require("../middleware/uploadMiddleware");
const auth = require("../middleware/authMiddleware");
const { uploadDocument } = require("../controllers/documentController");

router.post("/upload", auth, upload.single("file"), uploadDocument);

module.exports = router;
