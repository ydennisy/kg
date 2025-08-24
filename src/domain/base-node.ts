import type { NodeType } from './node-types.js';

abstract class BaseNode {
  readonly id: string;
  abstract readonly type: NodeType;
  readonly version: number;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly isPublic: boolean;
  abstract get title(): string;

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
