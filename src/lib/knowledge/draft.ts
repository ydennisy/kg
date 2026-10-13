import type { ItemDraft, ItemType } from './types';

/**
 * Turning what was typed into the search box into something worth saving.
 */

const URLISH = /^(https?:\/\/|www\.)\S+$/i;

/** A URL is a link, a question is a card, anything else is a note. */
export function guessType(text: string): ItemType {
  const trimmed = text.trim();
  if (URLISH.test(trimmed)) {
    return 'link';
  }
  return trimmed.includes('?') ? 'card' : 'note';
}

/**
 * The composer's opening state. A card typed as "question? answer" is split at
 * the first question mark, so a whole card can be written in the search box.
 */
export function draftFrom(
  type: ItemType,
  text: string,
  tags: string[] = [],
): ItemDraft {
  const trimmed = text.trim();
  const draft: ItemDraft = { type, a: trimmed, b: '', c: '', tags };
  if (type === 'card') {
    const mark = trimmed.indexOf('?');
    if (mark !== -1) {
      draft.a = trimmed.slice(0, mark + 1).trim();
      draft.b = trimmed.slice(mark + 1).trim();
    }
  }
  return draft;
}

/** Why a draft cannot be saved yet, or null when it can. */
export function draftProblem(draft: ItemDraft): string | null {
  switch (draft.type) {
    case 'card':
      return draft.a.trim() && draft.b.trim()
        ? null
        : 'A card needs both sides';
    case 'note':
      return draft.a.trim() ? null : 'A note needs a title';
    case 'link':
      return normalizeUrl(draft.a) ? null : 'A link needs a URL';
  }
}

/** `example.com/x` → `https://example.com/x`; null for anything not a URL. */
export function normalizeUrl(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed || /\s/.test(trimmed)) {
    return null;
  }
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;
  try {
    const url = new URL(withScheme);
    // Only web links: a stored `javascript:` URL would run on click.
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return null;
    }
    return url.hostname.includes('.') || url.hostname === 'localhost'
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

export function domain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

/** "Linear Algebra" → "linear-algebra". Tags are always stored this way. */
export function normalizeTag(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/^#+/, '')
    .replace(/\s+/g, '-')
    .replace(/[^\p{L}\p{N}_-]/gu, '');
}
