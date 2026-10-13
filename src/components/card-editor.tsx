'use client';

import { InputRule } from '@tiptap/core';
import { CodeBlockLowlight } from '@tiptap/extension-code-block-lowlight';
import { BlockMath, InlineMath } from '@tiptap/extension-mathematics';
import { Markdown } from '@tiptap/markdown';
import { EditorContent, useEditor } from '@tiptap/react';
import { Placeholder } from '@tiptap/extensions';
import { StarterKit } from '@tiptap/starter-kit';
import { common, createLowlight } from 'lowlight';
import { useState } from 'react';

import { Textarea } from '@/components/ui/textarea';

// The same highlighter the reader uses, so a code block looks the same while
// you are writing it as it does while you are drilling it.
const lowlight = createLowlight(common);

/**
 * Tiptap's own math input rules are `$$x$$` for inline and `$$$x$$$` for block,
 * which is inside out compared to LaTeX — and, more to the point, inconsistent
 * with what the extension *writes*: `$x$` inline, `$$x$$` block. Left alone,
 * typing what a card is stored as produces nothing, and typing what triggers
 * the rule saves as something else. These rules match the storage format.
 */
const inlineMathRule = InlineMath.extend({
  addInputRules() {
    return [
      new InputRule({
        find: /(?<!\$)\$([^$\n]+?)\$$/,
        handler: ({ state, range, match }) => {
          state.tr.replaceWith(
            range.from,
            range.to,
            this.type.create({ latex: match[1] }),
          );
        },
      }),
    ];
  },
});

const blockMathRule = BlockMath.extend({
  addInputRules() {
    return [
      new InputRule({
        find: /^\$\$([^$]+)\$\$$/,
        handler: ({ state, range, match }) => {
          state.tr.replaceWith(
            range.from,
            range.to,
            this.type.create({ latex: match[1] }),
          );
        },
      }),
    ];
  },
});

/**
 * A card side. Markdown in, markdown out — the rich text is only ever how the
 * editing feels, never how the card is stored.
 *
 * Until the editor mounts this is a plain textarea with the same `name`, so the
 * form submits correctly before (or without) JavaScript. The editor replaces it
 * and takes the `name` over to a hidden input.
 */
export function CardEditor({
  id,
  name,
  defaultValue = '',
  autoFocus = false,
  placeholder,
  className,
  onChange,
  onReady,
}: {
  id: string;
  name: string;
  defaultValue?: string;
  autoFocus?: boolean;
  placeholder?: string;
  /** Replaces the boxed form-field look, e.g. for the borderless composer. */
  className?: string;
  onChange?: (markdown: string) => void;
  onReady?: () => void;
}) {
  const [markdown, setMarkdown] = useState(defaultValue);
  const [ready, setReady] = useState(false);

  const editor = useEditor({
    // Required under SSR: the editor mounts in an effect instead of during
    // render, so the server and the first client render agree.
    immediatelyRender: false,
    autofocus: autoFocus && 'end',
    content: defaultValue,
    contentType: 'markdown',
    extensions: [
      // StarterKit brings the input rules — "# " for a heading, "- " for a
      // list, "```" for a code block — which is the whole point of this.
      StarterKit.configure({ codeBlock: false }),
      CodeBlockLowlight.configure({ lowlight }),
      inlineMathRule,
      blockMathRule,
      Markdown,
      ...(placeholder ? [Placeholder.configure({ placeholder })] : []),
    ],
    editorProps: {
      attributes: {
        id,
        class:
          className ??
          'card-prose min-h-36 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-base outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm dark:bg-input/30',
      },
    },
    onCreate: () => {
      setReady(true);
      onReady?.();
    },
    onUpdate: ({ editor }) => {
      const next = editor.getMarkdown();
      setMarkdown(next);
      onChange?.(next);
    },
  });

  return (
    <>
      {ready ? (
        <input type="hidden" name={name} value={markdown} />
      ) : (
        <Textarea
          id={id}
          name={name}
          defaultValue={defaultValue}
          rows={6}
          className="min-h-36"
          required
        />
      )}
      <div className={ready ? undefined : 'hidden'}>
        <EditorContent editor={editor} />
      </div>
    </>
  );
}
