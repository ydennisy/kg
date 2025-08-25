import { randomUUID } from 'node:crypto';
import type { EdgeType } from './edge-types.js';

class Edge {
  readonly id: string;
  readonly fromId: string;
  readonly toId: string;
  readonly type: EdgeType;
  readonly isBidirectional: boolean;
  readonly createdAt: Date;

  constructor(props: {
    id: string;
    fromId: string;
    toId: string;
    type: EdgeType;
    isBidirectional: boolean;
    createdAt: Date;
  }) {
    this.id = props.id;
    this.fromId = props.fromId;
    this.toId = props.toId;
    this.type = props.type;
    this.isBidirectional = props.isBidirectional;
    this.createdAt = props.createdAt;
  }

  static create(props: {
    fromId: string;
    toId: string;
    type: EdgeType;
    isBidirectional: boolean;
  }): Edge {
    if (props.fromId === props.toId) {
      throw new Error('Self-relations are not allowed');
    }

    const { type, isBidirectional } = props;

    const id = randomUUID();

    // canonicalize for undirected
    const [fromId, toId] =
      isBidirectional && props.fromId > props.toId
        ? [props.toId, props.fromId]
        : [props.fromId, props.toId];

    return new Edge({
      id,
      fromId,
      toId,
      type,
      isBidirectional,
      createdAt: new Date(),
    });
  }
}

export { Edge };
