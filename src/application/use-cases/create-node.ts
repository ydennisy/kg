import { FlashcardNode } from '../../domain/flashcard-node.js';
import { LinkNode } from '../../domain/link-node.js';
import { NoteNode } from '../../domain/note-node.js';
import { TagNode } from '../../domain/tag-node.js';
import type { NodeRepository } from '../ports/node-repository.js';
import type { AnyNode, NodeType } from '../../domain/node.js';
import type { Crawler } from '../ports/crawler.js';

type CreateNodeInput =
  | {
      type: 'flashcard';
      title?: string | undefined;
      isPublic: boolean;
      data: { front: string; back: string };
    }
  | {
      type: 'link';
      title?: string | undefined;
      isPublic: boolean;
      data: { url: string };
    }
  | {
      type: 'note';
      title: string;
      isPublic: boolean;
      data: { content: string };
    }
  | {
      type: 'tag';
      isPublic: boolean;
      data: { name: string };
    };

class CreateNodeUseCase {
  constructor(
    private readonly repository: NodeRepository,
    private readonly crawler: Crawler
  ) {}

  async execute(input: CreateNodeInput) {
    try {
      let node: AnyNode;

      const { type, isPublic, data } = input;

      switch (type) {
        case 'flashcard':
          node = FlashcardNode.create({ isPublic, data });
          break;

        case 'link':
          const { url } = data;
          const crawled = await this.crawler.fetch(url);
          node = LinkNode.create({
            isPublic,
            title: input.title,
            data: {
              url,
              crawled: {
                title: crawled.title,
                text: crawled.markdown ? crawled.markdown : crawled.text,
                html: crawled.html,
              },
            },
          });
          break;

        case 'note':
          node = NoteNode.create({ isPublic, title: input.title, data });
          break;

        case 'tag':
          node = TagNode.create({ isPublic, data });
          break;

        default:
          throw new Error(`unknown node type: ${type}`);
      }

      await this.repository.save(node);
      return { ok: true as const, result: node };
    } catch (err) {
      return { ok: false as const, error: (err as Error).message };
    }
  }
}

export { CreateNodeUseCase };
