const pool = require("../config/db");
const jwt = require("jsonwebtoken");
const { hashPassword, comparePasswords } = require("../utils/hash");
require("dotenv").config();

exports.register = async (req, res) => {
    try {
        const { email, password } = req.body;

        const hashed = await hashPassword(password);

        const result = await pool.query(
            "INSERT INTO users (email, password) VALUES ($1, $2) RETURNING id, email",
            [email, hashed]
        );

        res.json({ user: result.rows[0] });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await pool.query(
            "SELECT * FROM users WHERE email = $1",
            [email]
        );

        if (user.rows.length === 0)
            return res.status(400).json({ error: "User not found" });

        const valid = await comparePasswords(password, user.rows[0].password);
        if (!valid) return res.status(400).json({ error: "Incorrect password" });

        const token = jwt.sign(
            { id: user.rows[0].id, email: user.rows[0].email },
            process.env.JWT_SECRET,
            { expiresIn: "7d" }
        );

        res.json({ token });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
