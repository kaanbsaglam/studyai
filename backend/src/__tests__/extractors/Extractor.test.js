/**
 * Extractor base class + PdfParseExtractor tests.
 */

jest.mock('pdf-parse', () => jest.fn());

const pdfParse = require('pdf-parse');
const Extractor = require('../../extractors/Extractor');
const PdfParseExtractor = require('../../extractors/PdfParseExtractor');

describe('Extractor base class', () => {
  it('cannot be instantiated directly', () => {
    expect(() => new Extractor()).toThrow(/abstract/);
  });

  it('subclasses without overrides throw on extract/getName/getExtractionMethod', async () => {
    class Bare extends Extractor {}
    const b = new Bare();
    await expect(b.extract(Buffer.alloc(0))).rejects.toThrow(/extract/);
    expect(() => b.getName()).toThrow();
    expect(() => b.getExtractionMethod()).toThrow();
  });
});

describe('PdfParseExtractor', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns text and 0 tokens (no API used)', async () => {
    pdfParse.mockResolvedValue({ text: 'hello pdf', numpages: 3 });
    const ex = new PdfParseExtractor();
    const out = await ex.extract(Buffer.from('fake-pdf-bytes'));
    expect(out.text).toBe('hello pdf');
    expect(out.tokensUsed).toBe(0);
  });

  it('passes the buffer through to pdf-parse', async () => {
    pdfParse.mockResolvedValue({ text: '', numpages: 0 });
    const ex = new PdfParseExtractor();
    const buf = Buffer.from('xx');
    await ex.extract(buf);
    expect(pdfParse).toHaveBeenCalledWith(buf);
  });

  it('wraps underlying errors as a generic message (no leak)', async () => {
    pdfParse.mockRejectedValue(new Error('libpdf segfault @ 0xdeadbeef'));
    const ex = new PdfParseExtractor();
    await expect(ex.extract(Buffer.alloc(10))).rejects.toThrow('Failed to extract text from PDF');
  });

  it('reports its name and extraction method', () => {
    const ex = new PdfParseExtractor();
    expect(ex.getName()).toBe('pdf-parse');
    expect(ex.getExtractionMethod()).toBe('TEXT_ONLY');
  });
});
