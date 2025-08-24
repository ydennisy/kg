import { randomUUID } from 'node:crypto';
import { BaseNode } from './base-node.js';

type NoteNodeData = {
  content: string;
};

interface NoteNodeProps {
  id: string;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  isPublic: boolean;
  title: string;
  data: NoteNodeData;
}

class NoteNode extends BaseNode {
  readonly type: 'note';
  private _title: string;
  readonly data: NoteNodeData;

  constructor(input: NoteNodeProps) {
    super(input);
    this.type = 'note';
    this._title = input.title;
    this.data = input.data;
  }

  get title() {
    return this._title;
  }

  get content() {
    return this.data.content;
  }

  static create(input: {
    isPublic: boolean;
    title: string;
    data: NoteNodeData;
  }): NoteNode {
    const id = randomUUID();
    const now = new Date();
    return new NoteNode({
      id,
      version: 1,
      createdAt: now,
      updatedAt: now,
      isPublic: input.isPublic,
      title: input.title,
      data: input.data,
    });
  }

  static hydrate(input: NoteNodeProps): NoteNode {
    return new NoteNode(input);
  }
}

export { NoteNode };
