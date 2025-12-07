const jwt = require("jsonwebtoken");
require("dotenv").config();

module.exports = function (req, res, next) {
    const token = req.headers["authorization"];

    if (!token) return res.status(401).json({ error: "No token provided" });

    const actualToken = token.split(" ")[1];

    try {
        const decoded = jwt.verify(actualToken, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ error: "Invalid token" });
    }
};
