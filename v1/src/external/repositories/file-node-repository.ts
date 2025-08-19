import fs from 'node:fs/promises';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { NodeMapper } from '../../adapters/node-mapper.js';
import { Node, type NodeType } from '../../domain/node.js';
import type { NodeRepository, SearchResult } from '../../application/ports/node-repository.js';

class FileNodeRepository implements NodeRepository {
  constructor(private dataDir: string, private mapper: NodeMapper) {
    mkdirSync(this.dataDir, { recursive: true });
  }

  async save(node: Node): Promise<void> {
    const filePath = path.join(this.dataDir, `${node.id}.json`);
    const persistenceModel = this.mapper.toPersistence(node);
    await fs.writeFile(filePath, JSON.stringify(persistenceModel, null, 2));
  }
  async findAll(): Promise<Node[]> {
    const files = await fs.readdir(this.dataDir);
    const nodes: Node[] = [];
    for (const file of files) {
      const filePath = path.join(this.dataDir, file);
      const fileContent = await fs.readFile(filePath, 'utf-8');
      const json = JSON.parse(fileContent);
      nodes.push(this.mapper.toDomain(json));
    }
    return nodes;
  }

  async findById(id: string): Promise<Node | null> {
    const filePath = path.join(this.dataDir, `${id}.json`);
    const fileContent = await fs.readFile(filePath, 'utf-8');
    const json = JSON.parse(fileContent);
    return this.mapper.toDomain(json);
  }

  async searchNodes(query: string): Promise<SearchResult[]> {
    // Simple file-based search - get all nodes and filter in memory
    const allNodes = await this.findAll();
    const results = allNodes.filter(node => {
      const searchText = `${node.id} ${node.title} ${JSON.stringify(node.data)}`.toLowerCase();
      return searchText.includes(query.toLowerCase());
    });
    
    // Return with mock scores since file-based search doesn't have relevance scoring
    return results.map(node => ({
      node,
      score: 1.0, // Mock score for file-based search
    }));
  }
}

export { FileNodeRepository };
