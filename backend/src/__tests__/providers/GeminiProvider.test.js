/**
 * GeminiProvider tests.
 *
 * Mocks @google/generative-ai so we can verify model selection, schema
 * forwarding, token accounting, and error propagation.
 */

const mockGenerateContent = jest.fn();
const mockStreamObj = jest.fn();
const mockGetGenerativeModel = jest.fn().mockImplementation(() => ({
  generateContent: mockGenerateContent,
  generateContentStream: mockStreamObj,
}));

jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: mockGetGenerativeModel,
  })),
}));

const GeminiProvider = require('../../providers/GeminiProvider');

beforeEach(() => {
  jest.clearAllMocks();
});

describe('GeminiProvider.generateText', () => {
  it('throws when model is missing', async () => {
    const p = new GeminiProvider();
    await expect(p.generateText('hi')).rejects.toThrow(/model/);
  });

  it('returns parsed text and token usage', async () => {
    mockGenerateContent.mockResolvedValue({
      response: {
        text: () => 'hello world',
        usageMetadata: {
          promptTokenCount: 10,
          candidatesTokenCount: 5,
          totalTokenCount: 15,
        },
      },
    });

    const p = new GeminiProvider();
    const out = await p.generateText('prompt', { model: 'gemini-1.5-flash' });
    expect(out.text).toBe('hello world');
    expect(out.tokensUsed).toBe(15);
    expect(out.tokensIn).toBe(10);
    expect(out.tokensOut).toBe(5);
  });

  it('falls back to in+out when totalTokenCount missing', async () => {
    mockGenerateContent.mockResolvedValue({
      response: {
        text: () => 'x',
        usageMetadata: { promptTokenCount: 3, candidatesTokenCount: 2 },
      },
    });
    const p = new GeminiProvider();
    const out = await p.generateText('p', { model: 'g' });
    expect(out.tokensUsed).toBe(5);
  });

  it('forwards schema as structured-output config', async () => {
    mockGenerateContent.mockResolvedValue({
      response: {
        text: () => '{}',
        usageMetadata: {},
      },
    });
    const schema = { type: 'object', properties: { a: { type: 'string' } } };
    const p = new GeminiProvider();
    await p.generateText('p', { model: 'g', schema });
    const arg = mockGetGenerativeModel.mock.calls[0][0];
    expect(arg.generationConfig).toEqual({
      responseMimeType: 'application/json',
      responseSchema: schema,
    });
  });

  it('omits generationConfig when no schema', async () => {
    mockGenerateContent.mockResolvedValue({
      response: { text: () => 'x', usageMetadata: {} },
    });
    const p = new GeminiProvider();
    await p.generateText('p', { model: 'g' });
    expect(mockGetGenerativeModel.mock.calls[0][0]).toEqual({ model: 'g' });
  });

  it('rethrows underlying SDK errors', async () => {
    mockGenerateContent.mockRejectedValue(new Error('quota'));
    const p = new GeminiProvider();
    await expect(p.generateText('p', { model: 'g' })).rejects.toThrow('quota');
  });
});

describe('GeminiProvider.generateTextStream', () => {
  it('yields chunks and returns final usage', async () => {
    mockStreamObj.mockResolvedValue({
      stream: (async function* () {
        yield { text: () => 'foo' };
        yield { text: () => 'bar' };
        yield { text: () => '' }; // empty chunks should be skipped
      })(),
      response: Promise.resolve({
        usageMetadata: { promptTokenCount: 1, candidatesTokenCount: 2, totalTokenCount: 3 },
      }),
    });

    const p = new GeminiProvider();
    const gen = p.generateTextStream('p', { model: 'g' });
    const chunks = [];
    let final;
    while (true) {
      const { value, done } = await gen.next();
      if (done) { final = value; break; }
      chunks.push(value.chunk);
    }
    expect(chunks).toEqual(['foo', 'bar']);
    expect(final.tokensUsed).toBe(3);
  });

  it('throws when model is missing', async () => {
    const p = new GeminiProvider();
    const gen = p.generateTextStream('p', {});
    await expect(gen.next()).rejects.toThrow(/model/);
  });
});

describe('GeminiProvider.getName', () => {
  it('returns "gemini"', () => {
    expect(new GeminiProvider().getName()).toBe('gemini');
  });
});
