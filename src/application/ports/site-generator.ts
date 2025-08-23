import type { AnyNode } from '../../domain/node.js';

interface SiteFile {
  path: string; // e.g., "index.html", "nodes/abc123.html", "styles.css"
  content: string;
}

interface SiteGenerator {
  generate(nodes: Array<AnyNode>): Promise<SiteFile[]>;
}

export type { SiteGenerator, SiteFile };
