import { Info } from 'lucide-react';

import { Markdown } from '@/components/markdown';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverTitle,
  PopoverTrigger,
} from '@/components/ui/popover';

/**
 * Every example is rendered by the same pipeline the drill page uses, so this
 * is a live sample rather than a picture of one: if the renderer stops
 * supporting something, the help stops claiming it does.
 *
 * A server component for the same reason the reader is one — the markdown
 * machinery never reaches the browser. Only the popover itself is client-side.
 */
const SECTIONS: { title: string; rows: [source: string, sample: string][] }[] = [
  {
    title: 'Markdown',
    rows: [
      ['# Heading', '# Heading'],
      ['**bold** and *italic*', '**bold** and *italic*'],
      ['- a bullet', '- a bullet'],
      ['> a quote', '> a quote'],
    ],
  },
  {
    title: 'Maths',
    rows: [
      ['$\\pi(a \\mid s)$', 'Inline: $\\pi(a \\mid s)$'],
      ['$$R_{t+1} = r$$', '$$R_{t+1} = r$$'],
    ],
  },
  {
    title: 'Code',
    rows: [
      ['`inline code`', '`inline code`'],
      [
        '```python\nq[s, a] += lr * td\n```',
        '```python\nq[s, a] += lr * td\n```',
      ],
    ],
  },
];

export function SyntaxHelp() {
  return (
    <Popover>
      <PopoverTrigger
        render={<Button variant="ghost" size="icon-sm" />}
        aria-label="What a card can hold"
      >
        <Info />
      </PopoverTrigger>

      <PopoverContent className="w-[min(30rem,calc(100vw-2rem))]">
        <PopoverTitle>What a card can hold</PopoverTitle>
        <PopoverDescription className="mt-1">
          The editor formats as you type — the markers below are consumed as
          they are typed, and markdown is what gets stored.
        </PopoverDescription>

        <div className="mt-3 flex flex-col gap-3">
          {SECTIONS.map((section) => (
            <div key={section.title} className="flex flex-col gap-1.5">
              <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {section.title}
              </h3>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
                {section.rows.map(([source, sample]) => (
                  <div key={source} className="contents">
                    <code className="rounded-md bg-muted px-1.5 py-1 font-mono text-xs whitespace-pre-wrap text-muted-foreground">
                      {source}
                    </code>
                    <Markdown className="min-w-0 text-sm">{sample}</Markdown>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
