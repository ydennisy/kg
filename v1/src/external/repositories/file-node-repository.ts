import fs from 'node:fs/promises';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { NodeMapper } from '../../adapters/node-mapper.js';
import { Node, type NodeType } from '../../domain/node.js';
import type { NodeRepository } from '../../application/ports/node-repository.js';

class FileNodeRepository implements NodeRepository {
  constructor(private dataDir: string, private mapper: NodeMapper) {
    mkdirSync(this.dataDir, { recursive: true });
  }

  async save(node: Node): Promise<void> {
    const filePath = path.join(this.dataDir, `${node.id}.json`);
    const persistenceModel = this.mapper.toPersistence(node);
    await fs.writeFile(filePath, JSON.stringify(persistenceModel, null, 2));
  }

  async findById(id: string): Promise<Node | null> {
    const filePath = path.join(this.dataDir, `${id}.json`);
    const fileContent = await fs.readFile(filePath, 'utf-8');
    const json = JSON.parse(fileContent);
    return this.mapper.toDomain(json);
  }

  async list(): Promise<Node[]> {
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
}

export { FileNodeRepository };
