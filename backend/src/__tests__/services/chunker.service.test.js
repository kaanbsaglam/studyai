/**
 * Chunker Service Tests
 *
 * Tests for text chunking functionality used in document processing.
 */

const { chunkText, CHUNK_SIZE, CHUNK_OVERLAP } = require('../../services/chunker.service');

describe('chunker.service', () => {
  describe('chunkText', () => {
    it('should return empty array for empty string', () => {
      expect(chunkText('')).toEqual([]);
    });

    it('should return empty array for whitespace-only string', () => {
      expect(chunkText('   \n\n   ')).toEqual([]);
    });

    it('should return single chunk for text smaller than chunk size', () => {
      const text = 'This is a short text with only a few words.';
      const chunks = chunkText(text);

      expect(chunks).toHaveLength(1);
      expect(chunks[0]).toBe(text);
    });

    it('should split text into multiple chunks when exceeding chunk size', () => {
      // Create text with more words than default chunk size (800)
      const words = Array(1000).fill('word').join(' ');
      const chunks = chunkText(words);

      expect(chunks.length).toBeGreaterThan(1);
    });

    it('should respect custom chunk size', () => {
      const words = Array(100).fill('word').join(' ');
      const chunks = chunkText(words, { chunkSize: 30, overlap: 5 });

      expect(chunks.length).toBeGreaterThan(1);
      // First chunk should have approximately 30 words
      const firstChunkWords = chunks[0].split(' ').length;
      expect(firstChunkWords).toBeLessThanOrEqual(30);
    });

    it('should create overlapping chunks', () => {
      const words = Array(100).fill(0).map((_, i) => `word${i}`).join(' ');
      const chunks = chunkText(words, { chunkSize: 30, overlap: 10 });

      // Check that chunks overlap by verifying shared words
      if (chunks.length >= 2) {
        const firstChunkWords = chunks[0].split(' ');
        const secondChunkWords = chunks[1].split(' ');

        // Last words of first chunk should appear at start of second chunk
        const lastWordsOfFirst = firstChunkWords.slice(-10);
        const firstWordsOfSecond = secondChunkWords.slice(0, 10);

        expect(lastWordsOfFirst).toEqual(firstWordsOfSecond);
      }
    });

    it('should normalize line endings', () => {
      const text = 'Line one\r\nLine two\r\nLine three';
      const chunks = chunkText(text);

      expect(chunks[0]).not.toContain('\r\n');
      expect(chunks[0]).toContain('\n');
    });

    it('should reduce excessive newlines', () => {
      const text = 'Paragraph one\n\n\n\n\nParagraph two';
      const chunks = chunkText(text);

      expect(chunks[0]).not.toContain('\n\n\n');
      expect(chunks[0]).toContain('\n\n');
    });

    it('should normalize multiple spaces', () => {
      const text = 'Word    with    many    spaces';
      const chunks = chunkText(text);

      expect(chunks[0]).not.toContain('  ');
    });

    it('should handle text with only newlines', () => {
      const text = '\n\n\n';
      const chunks = chunkText(text);

      expect(chunks).toEqual([]);
    });

    it('should trim leading and trailing whitespace', () => {
      const text = '   Some text with spaces   ';
      const chunks = chunkText(text);

      expect(chunks[0]).toBe('Some text with spaces');
    });

    it('should handle text exactly at chunk size boundary', () => {
      const words = Array(CHUNK_SIZE).fill('word').join(' ');
      const chunks = chunkText(words);

      expect(chunks).toHaveLength(1);
    });

    it('should handle text just over chunk size', () => {
      const words = Array(CHUNK_SIZE + 1).fill('word').join(' ');
      const chunks = chunkText(words);

      expect(chunks.length).toBeGreaterThanOrEqual(1);
    });

    it('should export default constants', () => {
      expect(CHUNK_SIZE).toBe(800);
      expect(CHUNK_OVERLAP).toBe(150);
    });
  });
});
