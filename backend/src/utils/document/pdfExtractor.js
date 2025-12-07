const pdfParse = require("pdf-parse");

async function extractPDF(buffer) {
    const data = await pdfParse(buffer);
    return data.text;
}

module.exports = extractPDF;
