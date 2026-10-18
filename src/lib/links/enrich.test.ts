import { afterEach, describe, expect, it, vi } from 'vitest';
import { enrichLink } from './enrich';

const fetchMock = vi.fn();
function setup() {
  vi.stubEnv('TAVILY_API_KEY', 'test-tavily');
  vi.stubEnv('GROQ_API_KEY', 'test-groq');
  vi.stubGlobal('fetch', fetchMock);
  vi.spyOn(console, 'warn').mockImplementation(() => {});
}
const response = (data: unknown) => new Response(JSON.stringify(data));
const extraction = () =>
  response({
    results: [{ raw_content: '# Article title\n' + 'content '.repeat(3000) }],
  });
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  fetchMock.mockReset();
});

describe('link enrichment', () => {
  it('does no network work without a Tavily key', async () => {
    setup();
    vi.stubEnv('TAVILY_API_KEY', '');
    expect(await enrichLink('https://example.com')).toEqual({
      title: '',
      summary: '',
      keywords: '',
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it('extracts once, bounds model input and validates structured output', async () => {
    setup();
    fetchMock.mockResolvedValueOnce(extraction()).mockResolvedValueOnce(
      response({
        choices: [
          {
            finish_reason: 'stop',
            message: {
              content: JSON.stringify({
                title: 'Model rewritten title',
                summary: ' A useful\nsummary ',
                keywords: ['retrieval', 'retrieval', 42, 'search'],
              }),
            },
          },
        ],
      }),
    );
    expect(await enrichLink('https://example.com')).toEqual({
      title: 'Article title',
      summary: 'A useful summary',
      keywords: 'retrieval search',
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const request = JSON.parse(fetchMock.mock.calls[1][1].body);
    expect(JSON.parse(request.messages[1].content).content).toHaveLength(12000);
    expect(request.response_format.json_schema.strict).toBe(true);
    expect(fetchMock.mock.calls[0][1].signal).toBeInstanceOf(AbortSignal);
  });
  it.each([
    'missing key',
    'rate limit',
    'invalid JSON',
    'timeout',
    'truncated',
  ])('keeps the extracted title on Groq %s', async (failure) => {
    setup();
    fetchMock.mockResolvedValueOnce(extraction());
    if (failure === 'missing key') vi.stubEnv('GROQ_API_KEY', '');
    if (failure === 'rate limit')
      fetchMock.mockResolvedValueOnce(new Response('', { status: 429 }));
    if (failure === 'invalid JSON')
      fetchMock.mockResolvedValueOnce(
        response({
          choices: [{ finish_reason: 'stop', message: { content: 'oops' } }],
        }),
      );
    if (failure === 'timeout')
      fetchMock.mockRejectedValueOnce(
        new DOMException('Timed out', 'TimeoutError'),
      );
    if (failure === 'truncated')
      fetchMock.mockResolvedValueOnce(
        response({
          choices: [{ finish_reason: 'length', message: { content: '{}' } }],
        }),
      );
    expect(await enrichLink('https://example.com')).toEqual({
      title: 'Article title',
      summary: '',
      keywords: '',
    });
  });
  it.each(['failed URL', 'network error'])(
    'returns empty metadata on Tavily %s',
    async (failure) => {
      setup();
      if (failure === 'failed URL')
        fetchMock.mockResolvedValueOnce(
          response({ results: [], failed_results: [{ error: 'Blocked' }] }),
        );
      else fetchMock.mockRejectedValueOnce(new Error('Network unavailable'));
      expect(await enrichLink('https://example.com')).toEqual({
        title: '',
        summary: '',
        keywords: '',
      });
      expect(fetchMock).toHaveBeenCalledTimes(1);
    },
  );
});
