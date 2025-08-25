import { FlashcardNode } from './flashcard-node.js';
import { LinkNode } from './link-node.js';
import { NoteNode } from './note-node.js';
import { TagNode } from './tag-node.js';
import type { NodeType } from './node-types.js';
import type { EdgeType } from './edge-types.js';

type AnyNode = FlashcardNode | LinkNode | NoteNode | TagNode;

export type { AnyNode, NodeType, EdgeType };
