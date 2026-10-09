import rehypeHighlight from 'rehype-highlight';
import rehypeKatex from 'rehype-katex';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import rehypeStringify from 'rehype-stringify';
import remarkBreaks from 'remark-breaks';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import { unified } from 'unified';
import { toString } from 'mdast-util-to-string';
import type { Nodes, Parents } from 'mdast';

/**
 * Sanitizing happens *before* KaTeX and the highlighter run, not after: both
 * emit elaborate span/class/style trees that a sanitizer would either mangle or
 * have to be opened up so wide it stops being a sanitizer. Cleaning the user's
 * own content first and then decorating it keeps the untrusted input and the
 * generated markup separate.
 *
 * The one thing the schema has to let through is the `math-inline`/`math-display`
 * class remark-math leaves behind, since that is how rehype-katex finds the
 * nodes it should render.
 */
const schema: typeof defaultSchema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    code: [
      ...(defaultSchema.attributes?.code ?? []),
      ['className', /^language-./],
    ],
    span: [
      ...(defaultSchema.attributes?.span ?? []),
      ['className', 'math', 'math-inline'],
    ],
    div: [
      ...(defaultSchema.attributes?.div ?? []),
      ['className', 'math', 'math-display'],
    ],
  },
};

const renderer = unified()
  .use(remarkParse)
  .use(remarkGfm)
  // A newline in a flashcard is a line break, the way it was before any of this
  // was markdown. Without this, markdown would silently glue the lines together.
  .use(remarkBreaks)
  .use(remarkMath)
  // No `allowDangerousHtml`: raw HTML a card happens to contain stays inert text.
  .use(remarkRehype)
  .use(rehypeSanitize, schema)
  // `trust: false` is the default and matters — it disables \href, \htmlClass
  // and friends, which are the only parts of KaTeX that can emit real markup.
  .use(rehypeKatex, { trust: false, throwOnError: false })
  .use(rehypeHighlight, { detect: true })
  .use(rehypeStringify);

/** Card markdown to sanitized HTML, ready for `dangerouslySetInnerHTML`. */
export function renderMarkdown(markdown: string): string {
  return String(renderer.processSync(markdown));
}

const plain = unified().use(remarkParse).use(remarkGfm).use(remarkMath);

// `mdast-util-to-string` runs the whole tree together, so two paragraphs come
// back as "helloworld". Joining the block-level containers by hand keeps the
// word boundaries the preview needs.
const CONTAINERS = new Set([
  'root',
  'list',
  'listItem',
  'blockquote',
  'table',
  'tableRow',
  'footnoteDefinition',
]);

function flatten(node: Nodes): string {
  if (CONTAINERS.has(node.type) && 'children' in node) {
    return (node as Parents).children.map(flatten).join(' ');
  }
  return toString(node);
}

/** Card markdown flattened to one line, for list previews. */
export function toPlainText(markdown: string): string {
  return flatten(plain.parse(markdown)).replace(/\s+/g, ' ').trim();
}

/**
 * Markdown on its way in from the editor. Form encoding rewrites every newline
 * as CRLF, which is a transport artifact rather than anything the author typed,
 * so it never belongs in the database.
 */
export function normalizeMarkdown(value: string): string {
  return value.replace(/\r\n?/g, '\n').trim();
}
