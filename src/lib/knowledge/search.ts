import type { Item, ItemType } from './types';

/**
 * Everything the search screen shows, worked out from the items and what has
 * been typed. Pure: the browser calls it on every keystroke, and the tests call
 * it without one.
 */

export type Filter = { query: string; tag: string | null };

/**
 * Card answers are left out of the haystack on purpose: searching should not
 * turn into reading the back of every card.
 */
function haystack(item: Item): string {
  return [
    item.title,
    item.type === 'card' ? '' : item.body,
    item.url ?? '',
    item.type === 'link' ? item.summary : '',
    item.type === 'link' ? item.keywords : '',
    item.tags.join(' '),
  ]
    .join(' ')
    .toLowerCase();
}

export function newestFirst(items: Item[]): Item[] {
  return [...items].sort((a, b) => b.touchedAt - a.touchedAt);
}

export function search(items: Item[], { query, tag }: Filter): Item[] {
  const needle = query.trim().toLowerCase();
  return newestFirst(items).filter(
    (item) =>
      (!tag || item.tags.includes(tag)) &&
      (!needle || haystack(item).includes(needle)),
  );
}

export function countByType(items: Item[]): Record<ItemType, number> {
  const counts = { card: 0, note: 0, link: 0 };
  for (const item of items) {
    counts[item.type] += 1;
  }
  return counts;
}

/** Tags by how often they are used, most first; ties alphabetically. */
export function tagCounts(
  items: Item[],
  except: string | null = null,
): { name: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const item of items) {
    for (const tag of item.tags) {
      if (tag !== except) {
        counts.set(tag, (counts.get(tag) ?? 0) + 1);
      }
    }
  }
  return [...counts]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

export type Segment = { text: string; hit: boolean };

/** Splits `text` around case-insensitive occurrences of `query`. */
export function highlight(text: string, query: string): Segment[] {
  const needle = query.trim();
  if (!text) {
    return [];
  }
  if (!needle) {
    return [{ text, hit: false }];
  }
  const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return text
    .split(new RegExp(`(${escaped})`, 'gi'))
    .filter(Boolean)
    .map((part) => ({
      text: part,
      hit: part.toLowerCase() === needle.toLowerCase(),
    }));
}

/**
 * Items sharing a tag with `item`, newest first. Mid-drill only the notes and
 * links are worth showing — another card there would give its answer away.
 */
export function related(
  item: Item,
  items: Item[],
  { limit, cards = true }: { limit: number; cards?: boolean },
): Item[] {
  return newestFirst(items)
    .filter(
      (other) =>
        other.key !== item.key &&
        (cards || other.type !== 'card') &&
        other.tags.some((tag) => item.tags.includes(tag)),
    )
    .slice(0, limit);
}
