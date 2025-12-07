const bcrypt = require("bcrypt");

async function hashPassword(password) {
    return await bcrypt.hash(password, 10);
}

async function comparePasswords(password, hashed) {
    return await bcrypt.compare(password, hashed);
}

module.exports = { hashPassword, comparePasswords };
