import { describe, expect, it } from 'vitest';

import { normalizeMarkdown, renderMarkdown, toPlainText } from '@/lib/markdown';

describe('renderMarkdown', () => {
  it('renders basic markdown', () => {
    expect(renderMarkdown('# hello')).toContain('<h1>hello</h1>');
    expect(renderMarkdown('**bold**')).toContain('<strong>bold</strong>');
  });

  it('keeps a single newline as a line break', () => {
    expect(renderMarkdown('one\ntwo')).toContain('<br>');
  });

  it('renders inline and block math with katex', () => {
    const inline = renderMarkdown('mass is $E = mc^2$ here');
    expect(inline).toContain('katex');
    const block = renderMarkdown('$$\n\\frac{a}{b}\n$$');
    expect(block).toContain('katex-display');
  });

  it('highlights fenced code', () => {
    const html = renderMarkdown('```sql\nselect 1 from t;\n```');
    expect(html).toContain('<code');
    expect(html).toContain('hljs-');
  });

  it('does not execute raw html in a card', () => {
    const html = renderMarkdown('<script>alert(1)</script>');
    expect(html).not.toContain('<script>');
  });

  it('strips event handlers and javascript: urls', () => {
    expect(renderMarkdown('<img src=x onerror="alert(1)">')).not.toContain(
      'onerror',
    );
    expect(renderMarkdown('[x](javascript:alert(1))')).not.toContain(
      'javascript:',
    );
  });

  it('does not let katex emit markup', () => {
    const html = renderMarkdown('$\\href{javascript:alert(1)}{x}$');
    // KaTeX refuses \href under `trust: false` and renders the command as an
    // error instead. The literal source survives inside the MathML
    // <annotation>, which is inert text — what must not exist is a link
    // element or an href attribute pointing anywhere.
    expect(html).not.toMatch(/<a[\s>]/);
    expect(html).not.toMatch(/href\s*=/);
  });
});

describe('toPlainText', () => {
  it('flattens markdown to a single line', () => {
    expect(toPlainText('# hello\n\nsome **bold** text')).toBe(
      'hello some bold text',
    );
  });

  it('keeps code and math readable', () => {
    expect(toPlainText('what is `SELECT`?')).toBe('what is SELECT?');
    expect(toPlainText('solve $x^2$')).toBe('solve x^2');
  });
});

describe('normalizeMarkdown', () => {
  it('rewrites the CRLF that form encoding introduces', () => {
    expect(normalizeMarkdown('one\r\ntwo\r\n\r\nthree')).toBe(
      'one\ntwo\n\nthree',
    );
    expect(normalizeMarkdown('old\rmac')).toBe('old\nmac');
  });

  it('trims surrounding whitespace', () => {
    expect(normalizeMarkdown('\n\n  # hi  \n\n')).toBe('# hi');
  });

  it('leaves the body of the markdown alone', () => {
    // Blank lines inside a fence are the author's, not noise to tidy up.
    const fence = '```\na\n\n\n\nb\n```';
    expect(normalizeMarkdown(fence)).toBe(fence);
  });
});
