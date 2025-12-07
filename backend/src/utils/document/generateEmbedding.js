const axios = require("axios");
require("dotenv").config();

async function generateEmbedding(text) {
    try {
        const response = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${process.env.GEMINI_API_KEY}`,
            {
                content: {
                    parts: [
                        { text: text }
                    ]
                }
            },
            {
                headers: {
                    "Content-Type": "application/json"
                }
            }
        );

        const embedding = response.data.embedding?.values;

        if (!embedding) {
            console.error("❌ No embedding returned:", response.data);
            return null;
        }

        return embedding;

    } catch (err) {
        console.error("❌ Embedding error:", err.response?.data || err.message);
        return null;
    }
}

module.exports = generateEmbedding;
