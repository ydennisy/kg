const NODE_TYPES = ['note', 'link', 'tag', 'flashcard'] as const;

type NodeType = (typeof NODE_TYPES)[number];

export { NODE_TYPES };
export type { NodeType };
