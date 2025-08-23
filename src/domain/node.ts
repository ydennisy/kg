import { FlashcardNode } from './flashcard-node.js';
import { LinkNode } from './link-node.js';
import { NoteNode } from './note-node.js';
import { TagNode } from './tag-node.js';

type AnyNode = FlashcardNode | LinkNode | NoteNode | TagNode;
type NodeType = AnyNode['type'];

export type { AnyNode, NodeType };
