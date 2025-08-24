import { FlashcardNode } from './flashcard-node.js';
import { LinkNode } from './link-node.js';
import { NoteNode } from './note-node.js';
import { TagNode } from './tag-node.js';
import type { NodeType } from './node-types.js';

type AnyNode = FlashcardNode | LinkNode | NoteNode | TagNode;

type EdgeType =
  | 'references'
  | 'contains'
  | 'tagged_with'
  | 'similar_to'
  | 'responds_to';

export type { AnyNode, NodeType, EdgeType };
