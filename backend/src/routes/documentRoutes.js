const express = require("express");
const router = express.Router();
const upload = require("../middleware/uploadMiddleware");
const auth = require("../middleware/authMiddleware");
const { uploadDocument, getDocuments, deleteDocument } = require("../controllers/documentController");

// Upload Route
router.post("/upload", auth, upload.single("file"), uploadDocument);

// --- ADD THESE ROUTES ---
// Get list of documents for a specific classroom
router.get("/list/:classroomId", auth, getDocuments);

// Delete a specific document
router.delete("/:id", auth, deleteDocument);

module.exports = router;