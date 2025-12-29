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
function parseAIJson(text) {
    const cleanText = text.replace(/```json|```/g, '').trim();
    return JSON.parse(cleanText);
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
exports.generateQuiz = async (req, res) => {
    try {
        const { document_id } = req.body;
        const result = await pool.query("SELECT text_content FROM documents WHERE id = $1", [document_id]);
        const text = result.rows[0].text_content;

        const prompt = `
            Generate a quiz with 5 multiple-choice questions based on this text.
            RETURN ONLY RAW JSON. Do not use Markdown blocks.
            Structure:
            [
                {
                    "question": "Question text here?",
                    "options": ["Option A", "Option B", "Option C", "Option D"],
                    "correctAnswer": 0  // Index of the correct option (0-3)
                }
            ]
            Text: ${text.substring(0, 15000)} 
        `; // Truncate to avoid token limits if necessary

        const jsonStr = await callGemini(prompt);
        // clean markdown if Gemini adds it (```json ... ```)
        const cleanJson = jsonStr.replace(/```json|```/g, '').trim();
        
        const quizData = JSON.parse(cleanJson);
        
        // Save to DB immediately or let frontend decide? 
        // Let's return it first, frontend can call /save-quiz later.
        res.json({ quiz: quizData });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Quiz generation failed" });
    }
};

exports.saveQuiz = async (req, res) => {
    try {
        const { document_id, data } = req.body;
        await pool.query("INSERT INTO quizzes (document_id, data) VALUES ($1, $2)", [document_id, JSON.stringify(data)]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.saveSummary = async (req, res) => {
    try {
        const { document_id, content } = req.body;
        await pool.query(
            "INSERT INTO summaries (document_id, content) VALUES ($1, $2) RETURNING id",
            [document_id, content]
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.generateFlashcards = async (req, res) => {
    try {
        const { document_id } = req.body;
        const result = await pool.query("SELECT text_content FROM documents WHERE id = $1", [document_id]);
        
        if (result.rows.length === 0) return res.status(404).json({ error: "Document not found" });
        const text = result.rows[0].text_content;

        const prompt = `
            Create 10 flashcards based on the following text.
            RETURN ONLY RAW JSON. Format:
            [
              { "front": "Term or Question", "back": "Definition or Answer" }
            ]
            Text: ${text.substring(0, 15000)}
        `;
        
        const rawText = await callGemini(prompt);
        const flashcards = parseAIJson(rawText);
        
        res.json({ flashcards });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Flashcard generation failed" });
    }
};

exports.saveFlashcards = async (req, res) => {
    try {
        const { document_id, data } = req.body;
        // Data is the array of flashcard objects
        await pool.query(
            "INSERT INTO flashcards (document_id, data) VALUES ($1, $2)",
            [document_id, JSON.stringify(data)]
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};