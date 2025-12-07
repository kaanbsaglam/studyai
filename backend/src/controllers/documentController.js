const extractPDF = require("../utils/document/pdfExtractor");
const extractDOCX = require("../utils/document/docxExtractor");
const extractTXT = require("../utils/document/txtExtractor");
const chunkText = require("../utils/document/chunkText");
const generateEmbedding = require("../utils/document/generateEmbedding");
const index = require("../config/pinecone");
const s3 = require("../config/s3");
const pool = require("../config/db");

exports.uploadDocument = async (req, res) => {
    try {
        const { classroom_id } = req.body;
        const file = req.file;

        if (!file) return res.status(400).json({ error: "No file uploaded" });

        // 1. Upload to S3
        const uploadParams = {
            Bucket: process.env.AWS_BUCKET,
            Key: `documents/${Date.now()}-${file.originalname}`,
            Body: file.buffer,
        };

        const s3Result = await s3.upload(uploadParams).promise();
        const s3Url = s3Result.Location;

        // 2. Extract text
        let text = "";

        if (file.mimetype === "application/pdf") {
            text = await extractPDF(file.buffer);
        } else if (file.mimetype.includes("wordprocessingml")) {
            text = await extractDOCX(file.buffer);
        } else if (file.mimetype === "text/plain") {
            text = extractTXT(file.buffer);
        } else {
            return res.status(400).json({ error: "Unsupported file type" });
        }

        // 3. Insert metadata into DB
        const docInsert = await pool.query(
            `INSERT INTO documents (classroom_id, user_id, filename, s3_url, text_content)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING id`,
            [classroom_id, req.user.id, file.originalname, s3Url, text]
        );
        const documentId = docInsert.rows[0].id;

        // 4. Chunk text
        const chunks = chunkText(text);

        // 5. Create embeddings + upload to Pinecone
        const pineconeVectors = [];
        for (let i = 0; i < chunks.length; i++) {
            const chunkText = chunks[i];
            const embedding = await generateEmbedding(chunkText);

            pineconeVectors.push({
                id: `${documentId}-chunk-${i}`,
                values: embedding,
                metadata: {
                    classroom_id: classroom_id.toString(),
                    document_id: documentId.toString(),
                    chunk_index: i,
                    text: chunkText
                }
            });
        }

        await index.upsert(pineconeVectors);

        res.json({
            success: true,
            document_id: documentId,
            chunks_uploaded: pineconeVectors.length
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Document upload failed", details: err.message });
    }
};
