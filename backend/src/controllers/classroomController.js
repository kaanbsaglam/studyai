const pool = require("../config/db");

exports.createClassroom = async (req, res) => {
    try {
        const { name } = req.body;

        const result = await pool.query(
            "INSERT INTO classrooms (user_id, name) VALUES ($1, $2) RETURNING *",
            [req.user.id, name]
        );

        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getClassrooms = async (req, res) => {
    try {
        const result = await pool.query(
            "SELECT * FROM classrooms WHERE user_id = $1 ORDER BY created_at DESC",
            [req.user.id]
        );

        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
