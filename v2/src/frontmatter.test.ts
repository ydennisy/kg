import { describe, it, expect } from 'vitest';
import { parseFrontmatter, extractFrontmatter, test } from './frontmatter.js';

describe('test', () => {
  it('should return true for valid frontmatter', () => {
    expect(test('---\ntitle: test\n---\ncontent')).toBe(true);
  });

  it('should return false for no frontmatter', () => {
    expect(test('# Just content')).toBe(false);
  });

  it('should return false for empty string', () => {
    expect(test('')).toBe(false);
  });

  it('should return false for frontmatter with leading whitespace', () => {
    expect(test('   ---\ntitle: test')).toBe(false);
  });
});

describe('extractFrontmatter', () => {
  it('should extract front matter from markdown with YAML front matter', () => {
    const markdown = `---
title: Test Title
author: Test Author
---

# Content here`;

    const result = extractFrontmatter(markdown);

    expect(result.frontmatter).toBe(`title: Test Title
author: Test Author`);
    expect(result.body).toBe(`# Content here`);
    expect(result.bodyBegin).toBe(6);
  });

  it('should handle markdown without front matter', () => {
    const markdown = `# Just content
No front matter here`;

    const result = extractFrontmatter(markdown);

    expect(result.frontmatter).toBe('');
    expect(result.body).toBe(markdown);
    expect(result.bodyBegin).toBe(1);
  });

  it('should handle empty front matter', () => {
    const markdown = `---
---

# Content here`;

    const result = extractFrontmatter(markdown);

    expect(result.frontmatter).toBe('');
    expect(result.body).toBe(`# Content here`);
    expect(result.bodyBegin).toBe(4);
  });

  it('should NOT extract front matter with leading whitespace', () => {
    const markdown = `   ---
title: Test
---

Content`;

    const result = extractFrontmatter(markdown);

    expect(result.frontmatter).toBe('');
    expect(result.body).toBe(markdown);
    expect(result.bodyBegin).toBe(1);
  });

  it('should ignore --- that appears in content', () => {
    const markdown = `---
title: Test
---

Some content with --- dashes in it
More content`;

    const result = extractFrontmatter(markdown);

    expect(result.frontmatter).toBe('title: Test');
    expect(result.body).toBe(`Some content with --- dashes in it
More content`);
    expect(result.bodyBegin).toBe(5);
  });

  it('should NOT extract front matter when --- appears later in file', () => {
    const markdown = `# Some content first

---
title: Test
---

More content`;

    const result = extractFrontmatter(markdown);

    expect(result.frontmatter).toBe('');
    expect(result.body).toBe(markdown);
    expect(result.bodyBegin).toBe(1);
  });

  it('should handle complex YAML front matter', () => {
    const markdown = `---
id: 86df47e6-520f-42dd-9cc3-2b3930cbc44c
type: note
title: Space Elevators
links:
  - to: 2d8bc2d3-2e58-44c9-8fad-108d1a397502
    source: user
---

Content here`;

    const result = extractFrontmatter(markdown);

    expect(result.frontmatter).toBe(`id: 86df47e6-520f-42dd-9cc3-2b3930cbc44c
type: note
title: Space Elevators
links:
  - to: 2d8bc2d3-2e58-44c9-8fad-108d1a397502
    source: user`);
    expect(result.body).toBe('Content here');
    expect(result.bodyBegin).toBe(10);
  });
});

describe('parseFrontmatter', () => {
  it('should parse YAML front matter and return parsed object with content', () => {
    const markdown = `---
title: Test Title
author: Test Author
tags:
  - test
  - example
---

# Content here`;

    const result = parseFrontmatter(markdown);

    expect(result.attributes).toEqual({
      title: 'Test Title',
      author: 'Test Author',
      tags: ['test', 'example'],
    });
    expect(result.body).toBe('# Content here');
    expect(result.bodyBegin).toBe(9);
  });

  it('should handle markdown without front matter', () => {
    const markdown = `# Just content`;

    const result = parseFrontmatter(markdown);

    expect(result.attributes).toEqual({});
    expect(result.body).toBe(markdown);
    expect(result.bodyBegin).toBe(1);
  });

  it('should handle invalid YAML in front matter', () => {
    const markdown = `---
invalid: yaml: content: here
---

Content`;

    expect(() => parseFrontmatter(markdown)).toThrow();
  });

  it('should parse complex nested YAML', () => {
    const markdown = `---
id: 86df47e6-520f-42dd-9cc3-2b3930cbc44c
type: note
title: Space Elevators
links:
  - to: 2d8bc2d3-2e58-44c9-8fad-108d1a397502
    source: user
metadata:
  created: 2023-01-01
  updated: 2023-01-02
---

Content`;

    const result = parseFrontmatter(markdown);

    expect(result.attributes).toEqual({
      id: '86df47e6-520f-42dd-9cc3-2b3930cbc44c',
      type: 'note',
      title: 'Space Elevators',
      links: [
        {
          to: '2d8bc2d3-2e58-44c9-8fad-108d1a397502',
          source: 'user',
        },
      ],
      metadata: {
        created: '2023-01-01',
        updated: '2023-01-02',
      },
    });
    expect(result.body).toBe('Content');
    expect(result.bodyBegin).toBe(13);
  });
});
