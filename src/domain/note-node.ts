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

/**
 * Node representing a textual note with a title and content body.
 */
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

  /**
   * Gets the note's title.
   *
   * @returns Note title.
   */
  get title() {
    return this._title;
  }

  /**
   * Gets the note's content body.
   *
   * @returns Note content text.
   */
  get content() {
    return this.data.content;
  }

  /**
   * Creates a new note node with generated id and timestamps.
   *
   * @param input Object containing visibility, title and note data.
   * @returns Newly created note node.
   */
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

  /**
   * Recreates a note node from persisted properties.
   *
   * @param input Complete note node properties.
   * @returns Hydrated note node instance.
   */
  static hydrate(input: NoteNodeProps): NoteNode {
    return new NoteNode(input);
  }
}

export { NoteNode };
