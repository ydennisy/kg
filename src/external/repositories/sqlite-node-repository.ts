import { randomUUID } from 'node:crypto';
import { eq, or, inArray, sql, lte, asc } from 'drizzle-orm';
import { NodeMapper } from '../../adapters/node-mapper.js';
import {
  nodesTable,
  noteNodesTable,
  linkNodesTable,
  tagNodesTable,
  flashcardNodesTable,
  edgesTable,
} from '../database/schema.js';
import type { DatabaseClient } from '../database/client.js';
import type {
  NodeRepository,
  SearchResult,
} from '../../application/ports/node-repository.js';
import type { AnyNode, NodeType, EdgeType } from '../../domain/types.js';
import type { FlashcardNode } from '../../domain/flashcard-node.js';

const typeTableLookup: Record<
  NodeType,
  | typeof noteNodesTable
  | typeof linkNodesTable
  | typeof tagNodesTable
  | typeof flashcardNodesTable
> = {
  note: noteNodesTable,
  link: linkNodesTable,
  tag: tagNodesTable,
  flashcard: flashcardNodesTable,
};

class SqliteNodeRepository implements NodeRepository {
  constructor(
    private db: DatabaseClient,
    private mapper: NodeMapper
  ) {}

  async save(node: AnyNode): Promise<void> {
    const bundle = this.mapper.toRecords(node);

    await this.db.transaction(async (tx) => {
      await tx.insert(nodesTable).values(bundle.nodeRecord);
      await tx.insert(typeTableLookup[bundle.type]).values(bundle.typeRecord);
    });
  }

  async update(node: AnyNode): Promise<void> {
    const bundle = this.mapper.toRecords(node);

    await this.db.transaction(async (tx) => {
      await tx
        .update(nodesTable)
        .set({
          type: bundle.nodeRecord.type,
          title: bundle.nodeRecord.title,
          version: bundle.nodeRecord.version,
          isPublic: bundle.nodeRecord.isPublic,
          createdAt: bundle.nodeRecord.createdAt,
          updatedAt: bundle.nodeRecord.updatedAt,
        })
        .where(eq(nodesTable.id, bundle.nodeRecord.id));

      switch (bundle.type) {
        case 'note':
          await tx
            .update(noteNodesTable)
            .set({ content: bundle.typeRecord.content })
            .where(eq(noteNodesTable.nodeId, node.id));
          break;
        case 'link':
          await tx
            .update(linkNodesTable)
            .set({
              url: bundle.typeRecord.url,
              crawledTitle: bundle.typeRecord.crawledTitle,
              crawledText: bundle.typeRecord.crawledText,
              crawledHtml: bundle.typeRecord.crawledHtml,
            })
            .where(eq(linkNodesTable.nodeId, node.id));
          break;
        case 'tag':
          await tx
            .update(tagNodesTable)
            .set({
              name: bundle.typeRecord.name,
              description: bundle.typeRecord.description,
            })
            .where(eq(tagNodesTable.nodeId, node.id));
          break;
        case 'flashcard':
          await tx
            .update(flashcardNodesTable)
            .set({
              front: bundle.typeRecord.front,
              back: bundle.typeRecord.back,
              dueAt: bundle.typeRecord.dueAt,
              interval: bundle.typeRecord.interval,
              easeFactor: bundle.typeRecord.easeFactor,
              repetitions: bundle.typeRecord.repetitions,
              lastReviewedAt: bundle.typeRecord.lastReviewedAt,
            })
            .where(eq(flashcardNodesTable.nodeId, node.id));
          break;
      }
    });
  }

  // TODO: this is temporary helper to add edges until it is handled properly in the domain
  async link(
    fromId: string,
    toId: string,
    type: EdgeType,
    isBidirectional: boolean
  ) {
    await this.db.insert(edgesTable).values({
      id: randomUUID(),
      fromId,
      toId,
      type,
      isBidirectional,
      createdAt: new Date().toISOString(),
    });
  }

  async findAll(): Promise<AnyNode[]> {
    const results = await this.db.query.nodesTable.findMany({
      with: {
        noteNode: true,
        linkNode: true,
        tagNode: true,
        flashcardNode: true,
      },
    });

    return results.map((result) => this.mapper.toDomain(result));
  }

  async findById(
    id: string,
    withRelation: boolean = false
  ): Promise<AnyNode | null> {
    const result = await this.db.query.nodesTable.findFirst({
      where: eq(nodesTable.id, id),
      with: {
        noteNode: true,
        linkNode: true,
        tagNode: true,
        flashcardNode: true,
      },
    });

    if (!result) return null;

    const node = this.mapper.toDomain(result);

    // No relations required so we return just the node
    if (!withRelation) {
      return node;
    }

    // TODO: optimise this query by using the DB more and reducing round trips
    // Fetch edges
    const edges = await this.db.query.edgesTable.findMany({
      where: or(eq(edgesTable.fromId, id), eq(edgesTable.toId, id)),
    });

    // Fetch the actual related nodes
    const relatedNodeIds = edges.map((e) =>
      e.fromId === id ? e.toId : e.fromId
    );

    const relatedNodes = await this.db.query.nodesTable.findMany({
      where: inArray(nodesTable.id, relatedNodeIds),
      with: { noteNode: true, linkNode: true /* etc */ },
    });

    // Map to domain objects and attach to node
    const relatedMap = new Map();
    for (const edge of edges) {
      const relatedNodeRecord = relatedNodes.find(
        (n) => n.id === (edge.fromId === id ? edge.toId : edge.fromId)
      );
      if (relatedNodeRecord) {
        const relatedNode = this.mapper.toDomain(relatedNodeRecord);
        relatedMap.set(relatedNode.id, {
          node: relatedNode,
          relationship: {
            type: edge.type,
            direction:
              edge.fromId === id ? 'from' : edge.toId === id ? 'to' : 'both',
          },
        });
      }
    }

    node.setRelatedNodes(relatedMap);
    return node;
  }

  async search(query: string): Promise<SearchResult[]> {
    if (!query.trim()) {
      return [];
    }

    // Turns "quantum compute" into "quantum* compute*"
    const q = query
      .trim()
      .split(/\s+/)
      .map((t) => `${t}*`)
      .join(' ');

    // Uses FTS5 with BM25 scoring
    const results = await this.db.all(sql`
      SELECT DISTINCT
        n.id,
        n.type,
        n.title,
        rank AS score,
        snippet(nodes_fts, -1, '<b>', '</b>', '…', 20) AS snippet
      FROM nodes_fts
      JOIN nodes n 
        ON n.id = nodes_fts.id
      WHERE nodes_fts MATCH ${q}
        AND rank MATCH 'bm25(0.0, 5.0, 1.0)'
      ORDER BY rank
      LIMIT 25
    `);

    return results.map((row: any) => ({
      nodeId: row.id,
      type: row.type,
      title: row.title,
      snippet: row.snippet,
      score: Number(row.score),
    }));
  }

  async findDueFlashcards(date: Date, limit: number): Promise<FlashcardNode[]> {
    const records = await this.db.query.flashcardNodesTable.findMany({
      where: lte(flashcardNodesTable.dueAt, date.toISOString()),
      with: { node: true },
      orderBy: asc(flashcardNodesTable.dueAt),
      limit,
    });

    return records.map((r) => {
      const node = this.mapper.toDomain({ ...r.node, flashcardNode: r });
      if (node.type !== 'flashcard') {
        throw new Error('Expected flashcard node');
      }
      return node;
    });
  }
}

export { SqliteNodeRepository };
