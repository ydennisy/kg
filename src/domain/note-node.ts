import { randomUUID } from 'node:crypto';

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

class NoteNode {
  readonly id: string;
  readonly type: 'note';
  readonly version: number;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly isPublic: boolean;
  private _title: string;
  private _data: NoteNodeData;

  constructor(input: NoteNodeProps) {
    this.id = input.id;
    this.type = 'note';
    this.version = input.version;
    this.createdAt = input.createdAt;
    this.updatedAt = input.updatedAt;
    this.isPublic = input.isPublic;
    this._title = input.title;
    this._data = input.data;
  }

  get title() {
    return this._title;
  }

  get content() {
    return this._data.content;
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
