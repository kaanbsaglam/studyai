/**
 * OpenAIProvider tests.
 *
 * Mocks the openai SDK. Verifies message shape, schema strict-mode injection,
 * token usage parsing, and stream aggregation.
 */

const mockCreate = jest.fn();

jest.mock('openai', () => {
  return jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: (...args) => mockCreate(...args),
      },
    },
  }));
});

beforeAll(() => {
  process.env.OPENAI_LLM_SECRET_KEY = 'test-openai-key';
});

let OpenAIProvider;
beforeEach(() => {
  jest.clearAllMocks();
  jest.resetModules();
  // require after clearing modules so env reads fresh, also re-mock
  jest.doMock('openai', () =>
    jest.fn().mockImplementation(() => ({
      chat: { completions: { create: (...args) => mockCreate(...args) } },
    })),
  );
  OpenAIProvider = require('../../providers/OpenAIProvider');
});

describe('OpenAIProvider.generateText', () => {
  it('throws without model', async () => {
    const p = new OpenAIProvider();
    await expect(p.generateText('p')).rejects.toThrow(/model/);
  });

  it('sends user message and parses tokens', async () => {
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: 'hi' } }],
      usage: { prompt_tokens: 4, completion_tokens: 6, total_tokens: 10 },
    });
    const p = new OpenAIProvider();
    const out = await p.generateText('hello', { model: 'gpt-4' });
    expect(out.text).toBe('hi');
    expect(out.tokensIn).toBe(4);
    expect(out.tokensOut).toBe(6);
    expect(out.tokensUsed).toBe(10);

    const callArg = mockCreate.mock.calls[0][0];
    expect(callArg.model).toBe('gpt-4');
    expect(callArg.messages[0]).toEqual({ role: 'user', content: 'hello' });
    expect(callArg.response_format).toBeUndefined();
  });

  it('returns empty string when content is missing', async () => {
    mockCreate.mockResolvedValue({ choices: [{}], usage: {} });
    const p = new OpenAIProvider();
    const out = await p.generateText('p', { model: 'gpt-4' });
    expect(out.text).toBe('');
    expect(out.tokensUsed).toBe(0);
  });

  it('injects additionalProperties:false into object schemas (strict)', async () => {
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: '{}' } }],
      usage: { total_tokens: 1 },
    });
    const schema = {
      type: 'object',
      properties: {
        items: {
          type: 'array',
          items: { type: 'object', properties: { x: { type: 'string' } } },
        },
      },
    };
    const p = new OpenAIProvider();
    await p.generateText('p', { model: 'gpt-4', schema });
    const arg = mockCreate.mock.calls[0][0];
    expect(arg.response_format.type).toBe('json_schema');
    const prepared = arg.response_format.json_schema.schema;
    expect(prepared.additionalProperties).toBe(false);
    expect(prepared.properties.items.items.additionalProperties).toBe(false);
  });

  it('rethrows SDK errors', async () => {
    mockCreate.mockRejectedValue(new Error('rate limited'));
    const p = new OpenAIProvider();
    await expect(p.generateText('p', { model: 'gpt-4' })).rejects.toThrow('rate limited');
  });
});

describe('OpenAIProvider.generateTextStream', () => {
  it('yields content deltas and captures usage from final chunk', async () => {
    mockCreate.mockResolvedValue((async function* () {
      yield { choices: [{ delta: { content: 'foo' } }] };
      yield { choices: [{ delta: { content: 'bar' } }] };
      yield { choices: [{ delta: {} }], usage: { prompt_tokens: 2, completion_tokens: 3, total_tokens: 5 } };
    })());

    const p = new OpenAIProvider();
    const gen = p.generateTextStream('p', { model: 'gpt-4' });
    const chunks = [];
    let final;
    while (true) {
      const { value, done } = await gen.next();
      if (done) { final = value; break; }
      chunks.push(value.chunk);
    }
    expect(chunks).toEqual(['foo', 'bar']);
    expect(final.tokensUsed).toBe(5);
  });
});

describe('OpenAIProvider.getName', () => {
  it('returns "openai"', () => {
    expect(new OpenAIProvider().getName()).toBe('openai');
  });
});
