function chunkText(text, chunkSize = 800) {
    const words = text.split(/\s+/);
    const chunks = [];

    for (let i = 0; i < words.length; i += chunkSize) {
        const chunk = words.slice(i, i + chunkSize).join(" ");
        if (chunk.trim().length > 0) chunks.push(chunk);
    }

    return chunks;
}

module.exports = chunkText;
