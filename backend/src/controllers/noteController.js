const pool = require("../config/db");

exports.getNote = async (req, res) => {
    try {
        const { classroomId } = req.params;
        const result = await pool.query("SELECT * FROM notes WHERE classroom_id = $1", [classroomId]);
        res.json(result.rows[0] || { content: "" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.saveNote = async (req, res) => {
    try {
        const { classroomId } = req.params;
        const { content } = req.body;
        
        // Upsert logic (Update if exists, Insert if not)
        const check = await pool.query("SELECT id FROM notes WHERE classroom_id = $1", [classroomId]);
        
        if (check.rows.length > 0) {
            await pool.query("UPDATE notes SET content = $1, updated_at = NOW() WHERE classroom_id = $2", [content, classroomId]);
        } else {
            await pool.query("INSERT INTO notes (classroom_id, content) VALUES ($1, $2)", [classroomId, content]);
        }
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};