import { clean, empty, parseEnrichment, type LinkEnrichment } from './metadata';
import { LINK_SUMMARY_PROMPT } from './summary-prompt';

async function post(url: string, key: string, body: unknown, timeout: number) {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeout),
    cache: 'no-store',
    redirect: 'error',
  });
  if (!response.ok) throw new Error('Enrichment request failed');
  return response.json();
}

/** One extraction and one summary, no retries or browser machinery. */
export async function enrichLink(url: string): Promise<LinkEnrichment> {
  const tavilyKey = process.env.TAVILY_API_KEY;
  const groqKey = process.env.GROQ_API_KEY;
  if (!tavilyKey) return empty();
  let title = '';
  try {
    const extracted = await post(
      'https://api.tavily.com/extract',
      tavilyKey,
      {
        urls: [url],
        extract_depth: 'basic',
        format: 'markdown',
        timeout: 5,
        include_images: false,
      },
      7000,
    );
    const page = extracted?.results?.[0];
    // Tavily may omit title; Markdown's first heading is a useful fallback.
    const content =
      typeof page?.raw_content === 'string' ? page.raw_content.trim() : '';
    title =
      clean(page?.title, 300) || clean(content.match(/^#\s+(.+)$/m)?.[1], 300);
    if (!content || !groqKey) return { ...empty(), title };
    const completion = await post(
      'https://api.groq.com/openai/v1/chat/completions',
      groqKey,
      {
        model: 'qwen/qwen3.8-27b',
        reasoning_effort: 'none',
        temperature: 0,
        max_completion_tokens: 800,
        messages: [
          {
            role: 'system',
            content: LINK_SUMMARY_PROMPT,
          },
          {
            role: 'user',
            content: JSON.stringify({
              title,
              content: content.slice(0, 12000),
            }),
          },
        ],
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'link_metadata',
            strict: true,
            schema: {
              type: 'object',
              additionalProperties: false,
              properties: {
                title: { type: 'string' },
                summary: { type: 'string' },
                keywords: { type: 'array', items: { type: 'string' } },
              },
              required: ['title', 'summary', 'keywords'],
            },
          },
        },
      },
      12000,
    );
    const choice = completion?.choices?.[0];
    if (choice?.finish_reason !== 'stop') return { ...empty(), title };
    const result = parseEnrichment(JSON.parse(choice.message.content));
    return { ...result, title: title || result.title };
  } catch {
    // Do not log URLs, extracted content or credentials.
    console.warn(
      'Link enrichment unavailable; saving without complete metadata.',
    );
    return { ...empty(), title };
  }
}
