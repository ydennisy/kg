const RELATED_TO = 'related_to'; // bi-directional by convention
const CONTAINS = 'contains'; // A contains B (hierarchical)
const TAGGED_WITH = 'tagged_with'; // A is tagged with B
const EDGE_TYPES = [RELATED_TO, CONTAINS, TAGGED_WITH] as const;

type EdgeType = (typeof EDGE_TYPES)[number];

export { EDGE_TYPES };
export type { EdgeType };
