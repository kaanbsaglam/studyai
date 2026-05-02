/**
 * documentUpgrade.service tests.
 *
 * Pure-function `isUpgradeable` is the high-value surface to test exhaustively
 * (it is consumed by the API for client-side gating). performUpgrade is also
 * tested with embedding/queue mocked.
 */

jest.mock('../../services/embedding.service', () => ({
  deleteVectorsByIds: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../../lib/queue', () => ({
  addDocumentProcessingJob: jest.fn().mockResolvedValue(undefined),
  documentQueue: {
    getJob: jest.fn().mockResolvedValue(null),
  },
}));

const prisma = require('../../lib/prisma');
const { deleteVectorsByIds } = require('../../services/embedding.service');
const { addDocumentProcessingJob } = require('../../lib/queue');
const { isUpgradeable, performUpgrade } = require('../../services/documentUpgrade.service');

const READY_PDF = {
  status: 'READY',
  mimeType: 'application/pdf',
  extractionMethod: 'TEXT_ONLY',
  topicMetadata: null,
  reprocessingAt: null,
};

describe('isUpgradeable', () => {
  it('false for FREE user', () => {
    expect(isUpgradeable(READY_PDF, 'FREE')).toBe(false);
  });

  it('true for PREMIUM user with text-only PDF', () => {
    expect(isUpgradeable(READY_PDF, 'PREMIUM')).toBe(true);
  });

  it('false when document still processing', () => {
    expect(isUpgradeable({ ...READY_PDF, status: 'PENDING' }, 'PREMIUM')).toBe(false);
    expect(isUpgradeable({ ...READY_PDF, status: 'FAILED' }, 'PREMIUM')).toBe(false);
  });

  it('false when an upgrade is already in progress (reprocessingAt set)', () => {
    expect(
      isUpgradeable({ ...READY_PDF, reprocessingAt: new Date() }, 'PREMIUM'),
    ).toBe(false);
  });

  it('true for PDF that already has VISION extraction but lacks topics', () => {
    expect(
      isUpgradeable({ ...READY_PDF, extractionMethod: 'VISION', topicMetadata: null }, 'PREMIUM'),
    ).toBe(true);
  });

  it('false when fully upgraded (VISION + topics)', () => {
    expect(
      isUpgradeable(
        { ...READY_PDF, extractionMethod: 'VISION', topicMetadata: { topics: ['x'] } },
        'PREMIUM',
      ),
    ).toBe(false);
  });

  it('true for non-PDF with missing topics (still needs topic upgrade)', () => {
    expect(
      isUpgradeable(
        { ...READY_PDF, mimeType: 'text/plain', extractionMethod: 'TEXT_ONLY', topicMetadata: null },
        'PREMIUM',
      ),
    ).toBe(true);
  });

  it('false for non-PDF with topics already present', () => {
    expect(
      isUpgradeable(
        { ...READY_PDF, mimeType: 'text/plain', topicMetadata: { topics: ['a'] } },
        'PREMIUM',
      ),
    ).toBe(false);
  });
});

describe('performUpgrade', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    prisma.documentChunk.findMany.mockResolvedValue([]);
    prisma.document.update.mockResolvedValue({});
  });

  it('skips Pinecone delete when no chunks exist', async () => {
    await performUpgrade('d1');
    expect(deleteVectorsByIds).not.toHaveBeenCalled();
    expect(prisma.documentChunk.deleteMany).not.toHaveBeenCalled();
    expect(addDocumentProcessingJob).toHaveBeenCalledWith('d1');
  });

  it('deletes Pinecone vectors and chunk rows when chunks exist', async () => {
    prisma.documentChunk.findMany.mockResolvedValue([
      { pineconeId: 'p1' }, { pineconeId: 'p2' }, { pineconeId: null },
    ]);
    await performUpgrade('d1');
    expect(deleteVectorsByIds).toHaveBeenCalledWith(['p1', 'p2']);
    expect(prisma.documentChunk.deleteMany).toHaveBeenCalledWith({ where: { documentId: 'd1' } });
  });

  it('resets document to PENDING and stamps reprocessingAt', async () => {
    await performUpgrade('d1');
    const arg = prisma.document.update.mock.calls[0][0];
    expect(arg.where).toEqual({ id: 'd1' });
    expect(arg.data.status).toBe('PENDING');
    expect(arg.data.errorMessage).toBeNull();
    expect(arg.data.reprocessingAt).toBeInstanceOf(Date);
  });

  it('continues even if Pinecone delete fails', async () => {
    prisma.documentChunk.findMany.mockResolvedValue([{ pineconeId: 'p1' }]);
    deleteVectorsByIds.mockRejectedValueOnce(new Error('pinecone down'));
    await expect(performUpgrade('d1')).resolves.toBeUndefined();
    expect(prisma.document.update).toHaveBeenCalled();
    expect(addDocumentProcessingJob).toHaveBeenCalledWith('d1');
  });
});
