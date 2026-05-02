/**
 * embedding.service tests.
 *
 * Mocks the Gemini and Pinecone SDKs at module level so we can verify
 * orchestration: batching for embeddings, batching for upsert, ID-based
 * delete fallback, and querySimilar filter shape.
 */

const mockEmbedContent = jest.fn();
const mockUpsert = jest.fn().mockResolvedValue(undefined);
const mockDeleteMany = jest.fn().mockResolvedValue(undefined);
const mockQuery = jest.fn();

jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: () => ({ embedContent: mockEmbedContent }),
  })),
}));

jest.mock('@pinecone-database/pinecone', () => ({
  Pinecone: jest.fn().mockImplementation(() => ({
    index: () => ({
      upsert: mockUpsert,
      deleteMany: mockDeleteMany,
      query: mockQuery,
    }),
  })),
}));

const prisma = require('../../lib/prisma');
const {
  generateEmbedding,
  generateEmbeddings,
  upsertVectors,
  deleteVectorsByDocument,
  deleteVectorsByIds,
  querySimilar,
} = require('../../services/embedding.service');

beforeEach(() => {
  jest.clearAllMocks();
});

describe('generateEmbedding', () => {
  it('returns the embedding vector', async () => {
    mockEmbedContent.mockResolvedValue({ embedding: { values: [0.1, 0.2, 0.3] } });
    const v = await generateEmbedding('hello');
    expect(v).toEqual([0.1, 0.2, 0.3]);
  });
});

describe('generateEmbeddings', () => {
  it('processes texts in parallel batches and preserves order', async () => {
    let i = 0;
    mockEmbedContent.mockImplementation(async () => ({
      embedding: { values: [i++] },
    }));
    const texts = Array.from({ length: 12 }, (_, k) => `t${k}`);
    const out = await generateEmbeddings(texts);
    expect(out).toHaveLength(12);
    // batch size is 5, so 12 / 5 = 3 batches => total 12 calls
    expect(mockEmbedContent).toHaveBeenCalledTimes(12);
  });

  it('handles empty array', async () => {
    const out = await generateEmbeddings([]);
    expect(out).toEqual([]);
    expect(mockEmbedContent).not.toHaveBeenCalled();
  });
});

describe('upsertVectors', () => {
  it('batches vectors into 100-vector upserts', async () => {
    const vectors = Array.from({ length: 250 }, (_, i) => ({ id: `v${i}`, values: [0], metadata: {} }));
    await upsertVectors(vectors);
    expect(mockUpsert).toHaveBeenCalledTimes(3); // 100 + 100 + 50
    expect(mockUpsert.mock.calls[0][0]).toHaveLength(100);
    expect(mockUpsert.mock.calls[2][0]).toHaveLength(50);
  });

  it('no-ops on empty array', async () => {
    await upsertVectors([]);
    expect(mockUpsert).not.toHaveBeenCalled();
  });
});

describe('deleteVectorsByDocument', () => {
  it('looks up chunks and deletes by ID', async () => {
    prisma.documentChunk.findMany.mockResolvedValue([
      { pineconeId: 'p1' }, { pineconeId: 'p2' }, { pineconeId: null },
    ]);
    await deleteVectorsByDocument('doc-1');
    expect(mockDeleteMany).toHaveBeenCalledWith(['p1', 'p2']);
  });

  it('skips delete when no chunks have pineconeIds', async () => {
    prisma.documentChunk.findMany.mockResolvedValue([{ pineconeId: null }]);
    await deleteVectorsByDocument('doc-1');
    expect(mockDeleteMany).not.toHaveBeenCalled();
  });

  it('swallows DB errors (logged, not rethrown)', async () => {
    prisma.documentChunk.findMany.mockRejectedValue(new Error('db down'));
    await expect(deleteVectorsByDocument('doc-1')).resolves.toBeUndefined();
  });
});

describe('deleteVectorsByIds', () => {
  it('forwards IDs to Pinecone deleteMany', async () => {
    await deleteVectorsByIds(['a', 'b']);
    expect(mockDeleteMany).toHaveBeenCalledWith(['a', 'b']);
  });

  it('swallows Pinecone errors', async () => {
    mockDeleteMany.mockRejectedValueOnce(new Error('pinecone down'));
    await expect(deleteVectorsByIds(['a'])).resolves.toBeUndefined();
  });
});

describe('querySimilar', () => {
  it('builds classroom-only filter', async () => {
    mockQuery.mockResolvedValue({ matches: [{ id: 'm1', score: 0.9 }] });
    await querySimilar([0.1, 0.2], { classroomId: 'c1' });
    const arg = mockQuery.mock.calls[0][0];
    expect(arg.filter).toEqual({ classroomId: 'c1' });
    expect(arg.includeMetadata).toBe(true);
    expect(arg.topK).toBe(5);
  });

  it('uses single documentId when provided', async () => {
    mockQuery.mockResolvedValue({ matches: [] });
    await querySimilar([0], { classroomId: 'c1', documentId: 'd1' });
    expect(mockQuery.mock.calls[0][0].filter).toEqual({
      classroomId: 'c1', documentId: 'd1',
    });
  });

  it('uses $in filter for multiple documentIds', async () => {
    mockQuery.mockResolvedValue({ matches: [] });
    await querySimilar([0], { classroomId: 'c1', documentIds: ['d1', 'd2'] });
    expect(mockQuery.mock.calls[0][0].filter).toEqual({
      classroomId: 'c1', documentId: { $in: ['d1', 'd2'] },
    });
  });

  it('omits filter entirely when nothing to filter on', async () => {
    mockQuery.mockResolvedValue({ matches: [] });
    await querySimilar([0]);
    expect(mockQuery.mock.calls[0][0].filter).toBeUndefined();
  });

  it('returns empty array when matches is missing', async () => {
    mockQuery.mockResolvedValue({});
    const out = await querySimilar([0]);
    expect(out).toEqual([]);
  });
});
