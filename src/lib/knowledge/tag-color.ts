// A stable colour per tag without storing one: the same name always hashes to
// the same entry. Picked from the design system's palette, skipping the greys,
// the colours too pale to read as a tag, and near-twins (jade beside green).
// Eleven entries — a prime — so the hash spreads evenly across them.
const PALETTE = [
  'blue',
  'amber',
  'turquoise',
  'sky',
  'green',
  'orange',
  'crimson',
  'violet',
  'plum',
  'iris',
  'tomato',
] as const;

export type TagColor = (typeof PALETTE)[number];

export function tagColor(name: string): TagColor {
  // FNV-1a.
  let hash = 2166136261;
  for (const char of name) {
    hash ^= char.codePointAt(0)!;
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return PALETTE[hash % PALETTE.length];
}
