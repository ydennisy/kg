import fs from 'node:fs/promises';
import path from 'node:path';
import type { NodeRepository } from '../ports/node-repository.js';
import type { SiteGenerator } from '../ports/site-generator.js';

class PublishSiteUseCase {
  constructor(
    private readonly repository: NodeRepository,
    private readonly siteGenerator: SiteGenerator,
    private outputDir: string = './public'
  ) {}

  async execute() {
    try {
      // Get all nodes and filter for public ones
      const allNodes = await this.repository.findAll();
      const publicNodes = allNodes.filter((n) => n.isPublic);

      // Generate site files
      const siteFiles = await this.siteGenerator.generate(publicNodes);

      // Ensure output directory exists
      await fs.mkdir(this.outputDir, { recursive: true });

      // Write all generated files
      for (const file of siteFiles) {
        const fullPath = path.join(this.outputDir, file.path);
        const fileDir = path.dirname(fullPath);

        // Ensure subdirectories exist (e.g., nodes/)
        await fs.mkdir(fileDir, { recursive: true });

        // Write file content
        await fs.writeFile(fullPath, file.content, 'utf8');
      }

      return {
        ok: true as const,
        filesGenerated: siteFiles.length,
        outputDir: this.outputDir,
      };
    } catch (err) {
      return { ok: false as const, error: (err as Error).message };
    }
  }
}

export { PublishSiteUseCase };
