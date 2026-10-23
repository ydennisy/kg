import { normalizeTag } from './draft';

/**
 * Nested tags, as paths. The database stores a tree (`tags.parent_id`); every
 * other layer sees `programming/databases`, because a path searches, sorts and
 * displays without the tree in hand. Pure, so the browser and the server
 * actions share it.
 */

export const SEPARATOR = '/';

/** "Programming / Data Bases" → "programming/data-bases". */
export function normalizeTagPath(input: string): string {
  return input
    .split(SEPARATOR)
    .map(normalizeTag)
    .filter(Boolean)
    .join(SEPARATOR);
}

/** `tag` is `branch` itself or anywhere beneath it. */
export function within(tag: string, branch: string): boolean {
  return tag === branch || tag.startsWith(branch + SEPARATOR);
}

export function parentOf(path: string): string | null {
  const at = path.lastIndexOf(SEPARATOR);
  return at === -1 ? null : path.slice(0, at);
}

export function leaf(path: string): string {
  return path.slice(path.lastIndexOf(SEPARATOR) + 1);
}

export function rootOf(path: string): string {
  return path.split(SEPARATOR, 1)[0];
}

/** `a/b/c` → `['a', 'a/b']`, outermost first. */
export function ancestors(path: string): string[] {
  const parts = path.split(SEPARATOR);
  return parts
    .slice(0, -1)
    .map((_, i) => parts.slice(0, i + 1).join(SEPARATOR));
}

/** Every path, with the ancestors it implies, sorted. */
export function withAncestors(paths: Iterable<string>): string[] {
  const all = new Set<string>();
  for (const path of paths) {
    all.add(path);
    ancestors(path).forEach((a) => all.add(a));
  }
  return [...all].sort();
}

/** Direct children of `parent` (or the top level, for null) among `paths`. */
export function childrenOf(paths: string[], parent: string | null): string[] {
  return withAncestors(paths).filter((path) => parentOf(path) === parent);
}

/**
 * Tagging something `a/b` already says `a`, so an item never needs both. Drops
 * duplicates and every tag a more specific one implies.
 */
export function withoutImplied(tags: string[]): string[] {
  const unique = [...new Set(tags)];
  return unique
    .filter(
      (tag) => !unique.some((other) => other !== tag && within(other, tag)),
    )
    .sort();
}

/**
 * Adds `path` to an item's tags. A more specific tag replaces the ancestors it
 * implies; a broader one is already said. `note` explains whichever happened.
 */
export function addTag(
  tags: string[],
  path: string,
): { tags: string[]; note: string } {
  if (tags.includes(path)) {
    return { tags, note: '' };
  }
  const deeper = tags.find((tag) => within(tag, path));
  if (deeper) {
    return { tags, note: `${path} is already implied by ${deeper}.` };
  }
  const replaced = tags.filter((tag) => within(path, tag));
  return {
    tags: [...tags.filter((tag) => !replaced.includes(tag)), path],
    note: replaced.length
      ? `Replaced ${replaced.join(', ')}, which ${path} implies.`
      : '',
  };
}

/**
 * Paths for tag rows that only know their parent. A row whose chain is broken
 * or loops is left out rather than shown under the wrong name.
 */
export function tagPaths(
  rows: { id: number; parentId: number | null; name: string }[],
): Map<number, string> {
  const byId = new Map(rows.map((row) => [row.id, row]));
  const paths = new Map<number, string>();
  function resolve(id: number, seen: Set<number>): string | null {
    const known = paths.get(id);
    if (known !== undefined) return known;
    const row = byId.get(id);
    if (!row || seen.has(id)) return null;
    seen.add(id);
    const parent = row.parentId === null ? '' : resolve(row.parentId, seen);
    if (parent === null) return null;
    const path = parent ? parent + SEPARATOR + row.name : row.name;
    paths.set(id, path);
    return path;
  }
  for (const row of rows) resolve(row.id, new Set());
  return paths;
}

export type Suggestion = {
  path: string;
  /** Not a tag yet: choosing it creates it, and any missing parents. */
  create: boolean;
  /** How many tags sit directly inside it. */
  children: number;
};

/**
 * What the tag field offers for `input`: known tags containing it, those that
 * start with it first, then — when the typed path is new — creating it.
 * With nothing typed, the most used tags.
 */
export function suggestTags(
  known: string[],
  chosen: string[],
  input: string,
  limit = 6,
): Suggestion[] {
  const all = withAncestors(known);
  const kids = (path: string) => childrenOf(all, path).length;
  const open = all.filter((path) => !chosen.includes(path));
  const typed = input.trim().toLowerCase().replace(/^#+/, '');
  if (!typed) {
    return known
      .filter((path) => !chosen.includes(path))
      .slice(0, limit)
      .map((path) => ({ path, create: false, children: kids(path) }));
  }
  const starts = (path: string) =>
    path.startsWith(typed) || leaf(path).startsWith(typed) ? 0 : 1;
  const found = open
    .filter((path) => path.includes(typed))
    .sort((a, b) => starts(a) - starts(b) || a.length - b.length)
    .slice(0, limit)
    .map((path) => ({ path, create: false, children: kids(path) }));
  const wanted = normalizeTagPath(typed);
  if (wanted && !all.includes(wanted) && !chosen.includes(wanted)) {
    found.push({ path: wanted, create: true, children: 0 });
  }
  return found;
}
