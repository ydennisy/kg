import type { NodeType } from './node-types.js';

/**
 * Base class for all node types in the knowledge graph.
 */
abstract class BaseNode {
  readonly id: string;
  abstract readonly type: NodeType;
  readonly version: number;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly isPublic: boolean;

  /**
   * Gets the human readable title for the node.
   *
   * @returns Node title.
   */
  abstract get title(): string;

  /**
   * Gets content that should be indexed for search.
   *
   * @returns Searchable text content.
   */
  abstract get searchableContent(): string;

  constructor(props: {
    id: string;
    version: number;
    createdAt: Date;
    updatedAt: Date;
    isPublic: boolean;
  }) {
    this.id = props.id;
    this.version = props.version;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
    this.isPublic = props.isPublic;
  }
}

export { BaseNode };
