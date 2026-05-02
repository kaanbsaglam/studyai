/**
 * Chunker - additional edge cases.
 */

const { chunkText } = require('../../services/chunker.service');

describe('chunker.service - extra edge cases', () => {
  it('preserves all words across chunks (no data loss)', () => {
    const total = 250;
    const words = Array.from({ length: total }, (_, i) => `w${i}`).join(' ');
    const chunks = chunkText(words, { chunkSize: 50, overlap: 10 });

    // Every original word should appear in at least one chunk.
    const joined = chunks.join(' ');
    for (let i = 0; i < total; i++) {
      expect(joined).toContain(`w${i}`);
    }
  });

  it('chunks have monotonically advancing windows', () => {
    const total = 200;
    const words = Array.from({ length: total }, (_, i) => `w${i}`).join(' ');
    const chunks = chunkText(words, { chunkSize: 40, overlap: 10 });

    let prevEndIndex = -1;
    for (const chunk of chunks) {
      const last = chunk.split(' ').pop();
      const idx = parseInt(last.replace('w', ''), 10);
      expect(idx).toBeGreaterThanOrEqual(prevEndIndex);
      prevEndIndex = idx;
    }
  });

  it('handles unicode (CJK / emoji) words', () => {
    const text = '日本語 テスト 🚀 emoji ünicode';
    const chunks = chunkText(text);
    expect(chunks).toHaveLength(1);
    expect(chunks[0]).toContain('🚀');
    expect(chunks[0]).toContain('日本語');
  });

  it('handles tab characters as whitespace', () => {
    const text = 'word1\tword2\t\tword3';
    const chunks = chunkText(text);
    expect(chunks[0]).toBe('word1 word2 word3');
  });

  it('keeps double-newline paragraph separation', () => {
    const text = 'Para one.\n\nPara two.';
    const chunks = chunkText(text);
    expect(chunks[0]).toContain('\n\n');
  });
});
