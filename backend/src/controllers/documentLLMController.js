const axios = require("axios");
const pool = require("../config/db");
require("dotenv").config();

// TODO:
// 1. Verify document belongs to the authenticated user before generating summary/flashcards/questions.
// 2. Ensure document.classroom_id also belongs to the authenticated user.
// 3. Return 403 if user does not own the document or its classroom.

async function callGemini(prompt) {
    const response = await axios.post(
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

    return response.data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

exports.generateSummary = async (req, res) => {
    try {
        const { document_id } = req.body;

        const result = await pool.query(
            "SELECT text_content FROM documents WHERE id = $1",
            [document_id]
        );

        if (result.rows.length === 0)
            return res.status(404).json({ error: "Document not found" });

        const text = result.rows[0].text_content;

        const prompt = `
Summarize the following text into a clear, concise academic summary:

${text}
        `;

        const summary = await callGemini(prompt);
        res.json({ summary });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Summary generation failed" });
    }
};

exports.generateFlashcards = async (req, res) => {
    try {
        const { document_id } = req.body;

        const result = await pool.query(
            "SELECT text_content FROM documents WHERE id = $1",
            [document_id]
        );

        const text = result.rows[0].text_content;

        const prompt = `
Create flashcards from the following text. Format as JSON:
[
  { "question": "...", "answer": "..." },
  { "question": "...", "answer": "..." }
]

Text:
${text}
        `;

        const flashcards = await callGemini(prompt);
        res.json({ flashcards });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Flashcard generation failed" });
    }
};

exports.generateQuestions = async (req, res) => {
    try {
        const { document_id } = req.body;

        const result = await pool.query(
            "SELECT text_content FROM documents WHERE id = $1",
            [document_id]
        );

        const text = result.rows[0].text_content;

        const prompt = `
Generate 10 study questions based on the following text:

${text}
        `;

        const questions = await callGemini(prompt);
        res.json({ questions });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Question generation failed" });
    }
};
