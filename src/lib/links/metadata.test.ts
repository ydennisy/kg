import { describe, expect, it } from 'vitest';
import { parseEnrichment } from './metadata';

describe('metadata validation', () => {
  it('enforces the summary word limit independently of the model', () => {
    const result = parseEnrichment({ summary: 'word '.repeat(150) });
    expect(result.summary.split(' ')).toHaveLength(100);
  });

  it('bounds fields and rejects malformed values', () => {
    expect(parseEnrichment(null)).toEqual({
      title: '',
      summary: '',
      keywords: '',
    });
    expect(
      parseEnrichment({ title: 42, summary: [], keywords: 'wrong' }),
    ).toEqual({ title: '', summary: '', keywords: '' });
    const result = parseEnrichment({
      title: 'x'.repeat(400),
      keywords: Array.from({ length: 20 }, (_, index) => `keyword${index}`),
    });
    expect(result.title).toHaveLength(300);
    expect(result.keywords.split(' ')).toHaveLength(12);
  });
});
