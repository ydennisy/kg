import { randomUUID } from 'node:crypto';
import { eq, or, inArray, sql } from 'drizzle-orm';
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
            direction: edge.isBidirectional
              ? 'both'
              : edge.fromId === id
                ? 'from'
                : 'to',
          },
        });
      }
    }

    node.setRelatedNodes(relatedMap);
    return node;
  }

  async search(
    query: string,
    withRelations: boolean = false
  ): Promise<SearchResult[]> {
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
    const rows = await this.db.all<{
      id: string;
      type: NodeType;
      title: string;
      score: number;
      snippet: string;
    }>(sql`
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

    if (rows.length === 0) {
      return [];
    }

    const nodeRecords = await this.db.query.nodesTable.findMany({
      where: inArray(
        nodesTable.id,
        rows.map((r) => r.id)
      ),
      with: {
        noteNode: true,
        linkNode: true,
        tagNode: true,
        flashcardNode: true,
      },
    });

    const nodeMap = new Map<string, AnyNode>();
    for (const record of nodeRecords) {
      nodeMap.set(record.id, this.mapper.toDomain(record));
    }

    if (withRelations) {
      for (const node of nodeMap.values()) {
        const edges = await this.db.query.edgesTable.findMany({
          where: or(eq(edgesTable.fromId, node.id), eq(edgesTable.toId, node.id)),
        });

        if (edges.length === 0) continue;

        const relatedIds = edges.map((e) =>
          e.fromId === node.id ? e.toId : e.fromId
        );

        const relatedRecords = await this.db.query.nodesTable.findMany({
          where: inArray(nodesTable.id, relatedIds),
          with: {
            noteNode: true,
            linkNode: true,
            tagNode: true,
            flashcardNode: true,
          },
        });

        const relatedMap = new Map();
        for (const edge of edges) {
          const relatedRecord = relatedRecords.find(
            (n) => n.id === (edge.fromId === node.id ? edge.toId : edge.fromId)
          );
          if (relatedRecord) {
            const relatedNode = this.mapper.toDomain(relatedRecord);
            relatedMap.set(relatedNode.id, {
              node: relatedNode,
              relationship: {
                type: edge.type,
                direction: edge.isBidirectional
                  ? 'both'
                  : edge.fromId === node.id
                    ? 'from'
                    : 'to',
              },
            });
          }
        }

        node.setRelatedNodes(relatedMap);
      }
    }

    return rows.map((row) => ({
      node: nodeMap.get(row.id)!,
      snippet: row.snippet,
      score: Number(row.score),
    }));
  }
}

export { SqliteNodeRepository };
