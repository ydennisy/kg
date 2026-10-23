'use client';

import { IconBrain, IconFileText, IconLink, IconX } from '@tabler/icons-react';
import { Tag } from 'twenty-ui';

import { highlight } from '@/lib/knowledge/search';
import { tagColor } from '@/lib/knowledge/tag-color';
import { leaf, parentOf, rootOf, SEPARATOR } from '@/lib/knowledge/tags';
import type { ItemType } from '@/lib/knowledge/types';

export const TYPES: Record<
  ItemType,
  {
    label: string;
    plural: string;
    fg: string;
    bg: string;
    Icon: typeof IconBrain;
  }
> = {
  card: {
    label: 'Card',
    plural: 'Cards',
    fg: 'var(--t-color-blue11)',
    bg: 'var(--t-color-blue3)',
    Icon: IconBrain,
  },
  note: {
    label: 'Note',
    plural: 'Notes',
    fg: 'var(--t-color-amber11)',
    bg: 'var(--t-color-amber3)',
    Icon: IconFileText,
  },
  link: {
    label: 'Link',
    plural: 'Links',
    fg: 'var(--t-color-green11)',
    bg: 'var(--t-color-green3)',
    Icon: IconLink,
  },
};

export function TypeIcon({
  type,
  size = 14,
}: {
  type: ItemType;
  size?: number;
}) {
  const { Icon } = TYPES[type];
  return <Icon size={size} stroke={1.6} />;
}

/** The type icon on its tinted square, as used in lists. */
export function TypeTile({
  type,
  size = 20,
}: {
  type: ItemType;
  size?: number;
}) {
  return (
    <span
      className="flex flex-none items-center justify-center"
      style={{
        width: size,
        height: size,
        borderRadius: size / 4,
        background: TYPES[type].bg,
        color: TYPES[type].fg,
      }}
    >
      <TypeIcon type={type} size={12} />
    </span>
  );
}

/**
 * A tag, coloured by the top of its branch so a whole branch reads as one.
 * Its parents show faintly before its own name, unless `short` says the
 * context already gives them; `nested` marks a tag with more inside.
 */
export function TagChip({
  name,
  count,
  variant = 'soft',
  short = false,
  nested = false,
  onPick,
  onRemove,
}: {
  name: string;
  count?: number;
  variant?: 'soft' | 'outline';
  short?: boolean;
  nested?: boolean;
  onPick?: (name: string) => void;
  onRemove?: () => void;
}) {
  const parent = parentOf(name);
  const tag = (
    <Tag color={tagColor(rootOf(name))} variant={variant}>
      {parent && !short && (
        <span style={{ opacity: 0.6 }}>
          {parent}
          {SEPARATOR}
        </span>
      )}
      {leaf(name)}
      {count !== undefined && <span style={{ opacity: 0.7 }}> {count}</span>}
      {nested && (
        <span aria-label="has nested tags" style={{ opacity: 0.55 }}>
          {' '}
          ›
        </span>
      )}
      {onRemove && (
        <button
          type="button"
          aria-label={`Remove ${name}`}
          className="-mr-0.5 ml-1 inline-flex cursor-pointer align-middle opacity-60 hover:opacity-100"
          onClick={onRemove}
        >
          <IconX size={10} />
        </button>
      )}
    </Tag>
  );
  if (!onPick) {
    return <span className="flex flex-none">{tag}</span>;
  }
  return (
    <button
      type="button"
      className="flex flex-none cursor-pointer whitespace-nowrap"
      onClick={(event) => {
        event.stopPropagation();
        onPick(name);
      }}
    >
      {tag}
    </button>
  );
}

export function Highlighted({ text, query }: { text: string; query: string }) {
  return (
    <>
      {highlight(text, query).map((segment, index) =>
        segment.hit ? (
          <mark
            key={index}
            style={{
              background: 'var(--t-color-yellow4)',
              color: 'inherit',
              borderRadius: 2,
            }}
          >
            {segment.text}
          </mark>
        ) : (
          <span key={index}>{segment.text}</span>
        ),
      )}
    </>
  );
}

/** Server-rendered, sanitized markdown (see `renderMarkdown`). */
export function Html({
  html,
  className,
}: {
  html: string;
  className?: string;
}) {
  return (
    <div
      className={`card-prose ${className ?? ''}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

export function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        fontSize: 'var(--t-font-size-xs)',
        border: '1px solid var(--t-border-color-medium)',
        borderRadius: 4,
        padding: '1px 6px',
      }}
    >
      {children}
    </span>
  );
}
