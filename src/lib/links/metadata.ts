export type LinkEnrichment = {
  title: string;
  summary: string;
  keywords: string;
};

export const empty = (): LinkEnrichment => ({
  title: '',
  summary: '',
  keywords: '',
});
export const clean = (value: unknown, limit: number) =>
  typeof value === 'string'
    ? value.replace(/\s+/g, ' ').trim().slice(0, limit)
    : '';

/** Validate even structured output: failures must never prevent saving a link. */
export function parseEnrichment(value: unknown): LinkEnrichment {
  if (!value || typeof value !== 'object') return empty();
  const result = value as Record<string, unknown>;
  return {
    title: clean(result.title, 300),
    summary: clean(result.summary, 1200).split(' ').slice(0, 100).join(' '),
    keywords: Array.isArray(result.keywords)
      ? [
          ...new Set(
            result.keywords.map((word) => clean(word, 80)).filter(Boolean),
          ),
        ]
          .slice(0, 12)
          .join(' ')
      : '',
  };
}
