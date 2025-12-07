const multer = require("multer");

// Store temporarily in memory to send to S3
const storage = multer.memoryStorage();

const upload = multer({
    storage,
    limits: { fileSize: 20 * 1024 * 1024 } // 20MB max
});

module.exports = upload;
