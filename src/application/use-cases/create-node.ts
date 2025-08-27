import { FlashcardNode } from '../../domain/flashcard-node.js';
import { LinkNode } from '../../domain/link-node.js';
import { NoteNode } from '../../domain/note-node.js';
import { TagNode } from '../../domain/tag-node.js';
import type { NodeRepository } from '../ports/node-repository.js';
import type { AnyNode } from '../../domain/types.js';
import type { Crawler } from '../ports/crawler.js';
import { Result } from '../../shared/result.js';
import { warn } from 'node:console';

type CreateNodeInput =
  | {
      type: 'flashcard';
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
      data: { name: string; description?: string };
    };

class CreateNodeUseCase {
  constructor(
    private readonly repository: NodeRepository,
    private readonly crawler: Crawler
  ) {}

  async execute(
    input: CreateNodeInput
  ): Promise<Result<{ node: AnyNode; warning?: string | undefined }, Error>> {
    try {
      let node: AnyNode;
      let warning: string | undefined = undefined;

      const { type, isPublic, data } = input;

      switch (type) {
        case 'flashcard':
          node = FlashcardNode.create({ isPublic, data });
          break;

        case 'link':
          const { url } = data;
          const exists = await this.repository.findLinkNodeByUrl(url);
          if (exists) {
            return Result.failure(
              new Error(`A link node with URL: ${url} already exists`)
            );
          }

          // TODO: improve the URL validation and move into domain object
          try {
            new URL(url);
          } catch (err) {
            return Result.failure(
              new Error(`Please provide a valid URL, received: ${url}`)
            );
          }

          try {
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
          } catch (err) {
            // Create a node even when crawling has failed
            node = LinkNode.create({
              isPublic,
              title: input.title,
              data: {
                url,
                crawled: {
                  title: undefined,
                  text: undefined,
                  html: undefined,
                },
              },
            });

            warning =
              'Link node enrichment has failed, the link is saved. ' +
              'Please try to recrawl later.';
          }
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
      return Result.success({ node, warning });
    } catch (err) {
      console.error(err);
      return Result.failure(
        new Error('Unknown error whilst creating a new node')
      );
    }
  }
}

export { CreateNodeUseCase };
export type { CreateNodeInput };
