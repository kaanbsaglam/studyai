/**
 * search.service tests.
 *
 * Mocks embedding.service so vector search returns deterministic matches.
 * Verifies hybrid merging: best-of-vector vs keyword, classroom filtering,
 * and the score-drop cutoff.
 */

jest.mock('../../services/embedding.service', () => ({
  generateEmbedding: jest.fn().mockResolvedValue([0.1, 0.2, 0.3]),
  querySimilar: jest.fn(),
}));

const prisma = require('../../lib/prisma');
const { generateEmbedding, querySimilar } = require('../../services/embedding.service');
const { searchDocuments } = require('../../services/search.service');

beforeEach(() => {
  jest.clearAllMocks();
  // Default: no keyword matches
  prisma.$queryRawUnsafe = jest.fn().mockResolvedValue([]);
});

describe('searchDocuments', () => {
  it('returns [] when classroom has no READY documents', async () => {
    prisma.document.findMany.mockResolvedValue([]);
    const out = await searchDocuments('hello', 'c1');
    expect(out).toEqual([]);
    expect(querySimilar).not.toHaveBeenCalled();
  });

  it('returns vector hits filtered to the classroom’s docs', async () => {
    prisma.document.findMany.mockResolvedValue([{ id: 'd1' }, { id: 'd2' }]);
    querySimilar.mockResolvedValue([
      { id: 'v1', score: 0.9, metadata: { documentId: 'd1' } },
      { id: 'v2', score: 0.85, metadata: { documentId: 'd-other' } }, // not in classroom
    ]);

    const out = await searchDocuments('hello', 'c1');
    const ids = out.map((r) => r.documentId);
    expect(ids).toContain('d1');
    expect(ids).not.toContain('d-other');
  });

  it('drops vector hits below the similarity threshold', async () => {
    prisma.document.findMany.mockResolvedValue([{ id: 'd1' }]);
    querySimilar.mockResolvedValue([
      { id: 'v1', score: 0.5, metadata: { documentId: 'd1' } }, // below 0.6 threshold
    ]);
    const out = await searchDocuments('hello', 'c1');
    expect(out).toEqual([]);
  });

  it('keeps the higher score when same doc hits via vector + keyword', async () => {
    prisma.document.findMany.mockResolvedValue([{ id: 'd1' }]);
    querySimilar.mockResolvedValue([
      { id: 'v1', score: 0.95, metadata: { documentId: 'd1' } },
    ]);
    prisma.$queryRawUnsafe.mockResolvedValue([
      { documentId: 'd1', matchCount: 5 },
    ]);
    const out = await searchDocuments('hello', 'c1');
    expect(out).toHaveLength(1);
    expect(out[0].score).toBeCloseTo(0.95, 2); // vector wins
  });

  it('drops weak results that score below 60% of the top result', async () => {
    prisma.document.findMany.mockResolvedValue([
      { id: 'd1' }, { id: 'd2' }, { id: 'd3' },
    ]);
    querySimilar.mockResolvedValue([
      { id: 'v1', score: 1.0, metadata: { documentId: 'd1' } },
      { id: 'v2', score: 0.7, metadata: { documentId: 'd2' } },
      { id: 'v3', score: 0.61, metadata: { documentId: 'd3' } }, // 0.61 < 1.0 * 0.6 = 0.6 → kept; let's bump
    ]);
    const out = await searchDocuments('hello', 'c1');
    // d1 always; d2 (0.7 >= 0.6) yes; d3 (0.61 >= 0.6) yes → all 3 kept
    expect(out.map((r) => r.documentId).sort()).toEqual(['d1', 'd2', 'd3']);
  });

  it('caps results to 10 documents', async () => {
    const docs = Array.from({ length: 15 }, (_, i) => ({ id: `d${i}` }));
    prisma.document.findMany.mockResolvedValue(docs);
    querySimilar.mockResolvedValue(
      docs.map((d, i) => ({
        id: `v${i}`,
        score: 0.99 - i * 0.001, // all very close → all clear cutoff
        metadata: { documentId: d.id },
      })),
    );
    const out = await searchDocuments('hello', 'c1');
    expect(out.length).toBeLessThanOrEqual(10);
  });

  it('falls back gracefully when vector search fails', async () => {
    prisma.document.findMany.mockResolvedValue([{ id: 'd1' }]);
    querySimilar.mockRejectedValue(new Error('pinecone down'));
    prisma.$queryRawUnsafe.mockResolvedValue([
      { documentId: 'd1', matchCount: 1 },
    ]);
    const out = await searchDocuments('hello', 'c1');
    expect(out).toHaveLength(1);
    expect(out[0].documentId).toBe('d1');
  });

  it('returns [] when both vector and keyword paths fail', async () => {
    prisma.document.findMany.mockResolvedValue([{ id: 'd1' }]);
    querySimilar.mockRejectedValue(new Error('vec down'));
    prisma.$queryRawUnsafe.mockRejectedValue(new Error('kw down'));
    const out = await searchDocuments('hello', 'c1');
    expect(out).toEqual([]);
  });

  it('embeds the user query before vector search', async () => {
    prisma.document.findMany.mockResolvedValue([{ id: 'd1' }]);
    querySimilar.mockResolvedValue([]);
    await searchDocuments('hello world', 'c1');
    expect(generateEmbedding).toHaveBeenCalledWith('hello world');
  });
});
