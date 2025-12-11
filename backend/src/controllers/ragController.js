const axios = require("axios");
const generateEmbedding = require("../utils/document/generateEmbedding");
const index = require("../config/pinecone");
const pool = require("../config/db");
require("dotenv").config();

// TODO:
// 1. Verify classroom_id belongs to authenticated user before performing RAG search.
// 2. Return 403 if user is not the owner of the classroom.
// 3. (Optional) Ensure retrieved document chunks belong to user's classroom.

exports.askQuestion = async (req, res) => {
    try {
        const { classroom_id, question } = req.body;

        if (!classroom_id || !question)
            return res.status(400).json({ error: "classroom_id and question are required" });

        // 1. Convert question to embedding
        const queryEmbedding = await generateEmbedding(question);
        if (!queryEmbedding)
            return res.status(500).json({ error: "Failed to generate embedding" });

        // 2. Query Pinecone filtered by classroom
        const queryResponse = await index.query({
            vector: queryEmbedding,
            topK: 5,
            includeMetadata: true,
            filter: { classroom_id: classroom_id.toString() }
        });

        const matches = queryResponse.matches || [];

        const context = matches.map(m => m.metadata.text).join("\n\n");

        // 3. Build prompt
        const prompt = `
You are a helpful study assistant. Use ONLY the context to answer the question.

Context:
${context}

Question:
${question}

Answer:
`;

        // 4. Call Gemini (v1)
        const genResponse = await axios.post(
            "https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent",
            {
                contents: [
                    {
                        parts: [
                            { text: prompt }
                        ]
                    }
                ]
            },
            {
                params: { key: process.env.GEMINI_API_KEY }
            }
        );

        const answer =
            genResponse.data?.candidates?.[0]?.content?.parts?.[0]?.text ||
            "No answer generated.";

        res.json({
            answer,
            sources: matches
        });

    } catch (err) {
        console.error("RAG error:", err.response?.data || err.message);
        res.status(500).json({ error: "RAG request failed" });
    }
};
