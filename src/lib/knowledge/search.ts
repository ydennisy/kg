import { childrenOf, rootOf, within } from './tags';
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
      (!tag || item.tags.some((t) => within(t, tag))) &&
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

export type TagCount = { name: string; count: number };

const byUse = (a: TagCount, b: TagCount) =>
  b.count - a.count || a.name.localeCompare(b.name);

/**
 * Tags as written on the items, by how often they are used, most first; ties
 * alphabetically. `except` leaves out a whole branch — the one being filtered.
 */
export function tagCounts(
  items: Item[],
  except: string | null = null,
): TagCount[] {
  const counts = new Map<string, number>();
  for (const item of items) {
    for (const tag of item.tags) {
      if (!except || !within(tag, except)) {
        counts.set(tag, (counts.get(tag) ?? 0) + 1);
      }
    }
  }
  return [...counts].map(([name, count]) => ({ name, count })).sort(byUse);
}

/** Items tagged `branch` or anything beneath it. */
export function countWithin(items: Item[], branch: string): number {
  return items.filter((item) => item.tags.some((t) => within(t, branch)))
    .length;
}

/**
 * The tags directly inside `parent` — the top level, for null — each counting
 * every item in its branch once. `nested` says there is more inside.
 */
export function branchCounts(
  items: Item[],
  parent: string | null,
): (TagCount & { nested: boolean })[] {
  const paths = items.flatMap((item) => item.tags);
  return childrenOf(paths, parent)
    .map((name) => ({
      name,
      count: countWithin(items, name),
      nested: childrenOf(paths, name).length > 0,
    }))
    .sort(byUse);
}

/** Every tag path in use, ancestors included, the busiest branches first. */
export function knownTags(items: Item[]): string[] {
  const paths = items.flatMap((item) => item.tags);
  const all = childrenOf(paths, null).flatMap(function walk(path): string[] {
    return [path, ...childrenOf(paths, path).flatMap(walk)];
  });
  const counts = new Map(all.map((path) => [path, countWithin(items, path)]));
  return all.sort(
    (a, b) =>
      counts.get(b)! - counts.get(a)! ||
      rootOf(a).localeCompare(rootOf(b)) ||
      a.localeCompare(b),
  );
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
 * Items sharing a tag with `item` — the same tag, or one inside the other —
 * newest first. Mid-drill only the notes and
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
        other.tags.some((tag) =>
          item.tags.some((mine) => within(tag, mine) || within(mine, tag)),
        ),
    )
    .slice(0, limit);
}
