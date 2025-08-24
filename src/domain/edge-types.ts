const RELATED_TO = 'related_to'; // always bi-directional
const CONTAINS = 'contains'; // hierarchical
const TAGGED_WITH = 'tagged_with'; // used for adding tags (maybe)
const EDGE_TYPES = [RELATED_TO, CONTAINS, TAGGED_WITH] as const;

type EdgeType = (typeof EDGE_TYPES)[number];

export { EDGE_TYPES };
export type { EdgeType };
