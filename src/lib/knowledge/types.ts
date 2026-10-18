export const ITEM_TYPES = ['card', 'note', 'link'] as const;
export type ItemType = (typeof ITEM_TYPES)[number];

/**
 * One thing in the knowledge base, flattened so the browser can search it
 * without a round trip. Cards and notes live in different tables; `key` is
 * what keeps their ids from colliding once they share a list.
 */
export type Item = {
  key: string;
  id: number;
  type: ItemType;
  /** Plain text, for search, highlighting and lists. */
  title: string;
  body: string;
  summary: string;
  keywords: string;
  /** The stored markdown, for the editor. */
  titleMarkdown: string;
  bodyMarkdown: string;
  /** Sanitized HTML rendered on the server, for reading. */
  titleHtml: string;
  bodyHtml: string;
  url: string | null;
  tags: string[];
  /** Epoch ms of the last edit, or of creation. Newest first everywhere. */
  touchedAt: number;
  /** "Oct 1", formatted on the server so it cannot disagree with hydration. */
  date: string;
  /** Cards only: the scheduler says it is time to see it again. */
  due: boolean;
};

export type ItemDraft = {
  type: ItemType;
  /** Card front, note title, or link URL. */
  a: string;
  /** Card back, note body, or link title. */
  b: string;
  /** Links only: a note to go with it. */
  c: string;
  tags: string[];
};

export const itemKey = (type: ItemType, id: number) =>
  `${type === 'card' ? 'card' : 'note'}:${id}`;
