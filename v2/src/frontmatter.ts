import { parse as parseYaml } from 'yaml';

interface FrontmatterResult {
  frontmatter: string;
  body: string;
  bodyBegin: number;
}

interface ParsedFrontmatterResult {
  attributes: Record<string, any>;
  body: string;
  bodyBegin: number;
  frontmatter: string;
}

interface FrontmatterOptions {
  allowUnsafe?: boolean;
}

function test(string: string): boolean {
  if (!string) return false;
  const lines = string.split(/\r?\n/);
  return lines[0] === '---';
}

function extractFrontmatter(markdown: string): FrontmatterResult {
  if (!test(markdown)) {
    return {
      frontmatter: '',
      body: markdown,
      bodyBegin: 1,
    };
  }

  const lines = markdown.split(/\r?\n/);
  const frontmatterStartIndex = 0;

  // Find the closing delimiter
  let frontmatterEndIndex = -1;
  for (let i = frontmatterStartIndex + 1; i < lines.length; i++) {
    if (lines[i]?.trim() === '---') {
      frontmatterEndIndex = i;
      break;
    }
  }

  // If no closing delimiter found, treat as no front matter
  if (frontmatterEndIndex === -1) {
    return {
      frontmatter: '',
      body: markdown,
      bodyBegin: 1,
    };
  }

  // Extract front matter (between delimiters)
  const frontmatterLines = lines.slice(
    frontmatterStartIndex + 1,
    frontmatterEndIndex
  );
  const frontmatter = frontmatterLines.join('\n');

  // Extract content (after closing delimiter)
  const contentLines = lines.slice(frontmatterEndIndex + 1);

  // Remove leading empty lines from content
  while (contentLines.length > 0 && contentLines[0]?.trim() === '') {
    contentLines.shift();
  }

  const body = contentLines.join('\n');
  // Calculate the line where body content actually starts (1-based)
  // frontmatterEndIndex is the line with closing ---, so body starts after that
  // We need to account for removed empty lines
  const removedEmptyLines =
    lines.slice(frontmatterEndIndex + 1).length - contentLines.length;
  const bodyBegin = frontmatterEndIndex + 2 + removedEmptyLines;

  return {
    frontmatter,
    body,
    bodyBegin,
  };
}

function parseFrontmatter(
  markdown: string,
  options?: FrontmatterOptions
): ParsedFrontmatterResult {
  const { frontmatter, body, bodyBegin } = extractFrontmatter(markdown);

  if (frontmatter.trim() === '') {
    return {
      attributes: {},
      body,
      bodyBegin,
      frontmatter: '',
    };
  }

  try {
    // Note: js-yaml uses safeLoad/load, but yaml package uses parse with safe: true/false
    const attributes = parseYaml(frontmatter) || {};
    return {
      attributes,
      body,
      bodyBegin,
      frontmatter,
    };
  } catch (error) {
    throw new Error(
      `Failed to parse YAML frontmatter: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`
    );
  }
}

// Exports
export { test, extractFrontmatter, parseFrontmatter };
export type { FrontmatterResult, ParsedFrontmatterResult, FrontmatterOptions };
