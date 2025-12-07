const textract = require("textract");

async function extractDOCX(buffer) {
    return new Promise((resolve, reject) => {
        textract.fromBufferWithMime("application/vnd.openxmlformats-officedocument.wordprocessingml.document", buffer, (err, text) => {
            if (err) return reject(err);
            resolve(text);
        });
    });
}

module.exports = extractDOCX;
