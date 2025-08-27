const RELATED_TO = 'related_to'; // bi-directional by convention
const CONTAINS = 'contains'; // A contains B (hierarchical)
const TAGGED_WITH = 'tagged_with'; // A is tagged with B
const DERIVED_FROM = 'derived_from'; // special relation for flashcard derived from a source (link or note)

const EDGE_TYPES = [RELATED_TO, CONTAINS, TAGGED_WITH, DERIVED_FROM] as const;
type EdgeType = (typeof EDGE_TYPES)[number];

export { EDGE_TYPES };
export type { EdgeType };
