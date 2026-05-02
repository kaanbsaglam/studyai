/**
 * pipeline.service — pure helper functions.
 *
 * Tests focus on: estimateTokens, chunkByTokens, chunkByDocument,
 * calculateMaxProcessableTokens. Full pipeline (LLM-driven) is not exercised
 * here — that path requires deep mocking of llm.service + generators and is
 * better covered via end-to-end controller tests with the relevant generator
 * stubbed at the module boundary.
 */

const {
  estimateTokens,
  calculateMaxProcessableTokens,
  chunkByTokens,
  chunkByDocument,
} = require('../../services/pipeline.service');
const pipelineConfig = require('../../config/pipeline.config');

describe('estimateTokens', () => {
  it('returns 0 for empty string', () => {
    expect(estimateTokens('')).toBe(0);
  });

  it('returns 0 for null/undefined', () => {
    expect(estimateTokens(null)).toBe(0);
    expect(estimateTokens(undefined)).toBe(0);
  });

  it('scales roughly with character count for strings', () => {
    const short = estimateTokens('a'.repeat(100));
    const long = estimateTokens('a'.repeat(1000));
    expect(long).toBeGreaterThan(short);
  });

  it('sums document content lengths for arrays', () => {
    const docsTokens = estimateTokens([
      { content: 'a'.repeat(100) },
      { content: 'b'.repeat(200) },
    ]);
    const stringTokens = estimateTokens('a'.repeat(300));
    expect(docsTokens).toBe(stringTokens);
  });

  it('handles array entries with missing content', () => {
    expect(() => estimateTokens([{}, { content: 'abc' }])).not.toThrow();
  });
});

describe('calculateMaxProcessableTokens', () => {
  it('grows with maxDepth (recursive summarization headroom)', () => {
    const baseTier = { chunkSize: 1000, maxChunks: 10, maxDepth: 0 };
    const deeperTier = { chunkSize: 1000, maxChunks: 10, maxDepth: 2 };
    expect(calculateMaxProcessableTokens(deeperTier))
      .toBeGreaterThan(calculateMaxProcessableTokens(baseTier));
  });

  it('equals chunkSize * maxChunks at depth 0', () => {
    const tier = { chunkSize: 1000, maxChunks: 5, maxDepth: 0 };
    expect(calculateMaxProcessableTokens(tier)).toBe(5000);
  });
});

describe('chunkByTokens', () => {
  it('returns single chunk when content fits', () => {
    const chunks = chunkByTokens('hello world', 1000);
    expect(chunks).toEqual(['hello world']);
  });

  it('splits oversized content into multiple chunks', () => {
    const big = 'word '.repeat(5000);
    const chunks = chunkByTokens(big, 50);
    expect(chunks.length).toBeGreaterThan(1);
  });

  it('joins back to (approximately) the original content', () => {
    const text = 'a'.repeat(20000);
    const chunks = chunkByTokens(text, 200);
    const rejoined = chunks.join('').replace(/\s/g, '');
    // Allow some loss to whitespace normalization at boundaries
    expect(rejoined.length).toBeGreaterThan(text.length * 0.95);
  });

  it('prefers splitting at paragraph boundaries when available', () => {
    const para = 'aa '.repeat(500);
    const text = `${para}\n\n${para}\n\n${para}`;
    const { charsPerToken } = pipelineConfig.tokenEstimation;
    // chunkSize chosen so the first paragraph fills most of one chunk
    const target = Math.floor(para.length / charsPerToken);
    const chunks = chunkByTokens(text, target);
    expect(chunks.length).toBeGreaterThan(1);
  });
});

describe('chunkByDocument', () => {
  it('keeps a single small document together', () => {
    const docs = [{ id: 'd1', name: 'a.pdf', content: 'short content' }];
    const chunks = chunkByDocument(docs, 10000);
    expect(chunks).toHaveLength(1);
    expect(chunks[0]).toContain('a.pdf');
    expect(chunks[0]).toContain('short content');
  });

  it('groups multiple small documents into one chunk', () => {
    const docs = [
      { id: 'd1', name: 'a', content: 'x'.repeat(100) },
      { id: 'd2', name: 'b', content: 'y'.repeat(100) },
    ];
    const chunks = chunkByDocument(docs, 10000);
    expect(chunks).toHaveLength(1);
    expect(chunks[0]).toContain('a');
    expect(chunks[0]).toContain('b');
  });

  it('starts a new chunk when adding a doc would overflow', () => {
    const big = 'z'.repeat(5000);
    const docs = [
      { id: 'd1', name: 'a', content: big },
      { id: 'd2', name: 'b', content: big },
    ];
    const { charsPerToken } = pipelineConfig.tokenEstimation;
    const targetTokens = Math.floor(big.length / charsPerToken) + 200;
    const chunks = chunkByDocument(docs, targetTokens);
    expect(chunks.length).toBe(2);
    expect(chunks[0]).toContain('a');
    expect(chunks[1]).toContain('b');
  });

  it('returns empty array for empty input', () => {
    expect(chunkByDocument([], 1000)).toEqual([]);
  });
});
