import { marked } from 'marked';
import type { AnyNode, NodeType, EdgeType } from '../../domain/types.js';
import type {
  SiteGenerator,
  SiteFile,
} from '../../application/ports/site-generator.js';

interface LinkData {
  url: string;
  crawled: {
    title: string | undefined;
    text: string | undefined;
    html: string | undefined;
  };
}

interface FlashcardData {
  front: string;
  back: string;
}

interface ContentData {
  content: string;
}

interface GraphNodeData {
  id: string;
  label: string;
  type: NodeType;
  color: string;
}

interface GraphEdgeData {
  id: string;
  source: string;
  target: string;
  label: EdgeType;
  bidirectional: boolean;
}

export class HTMLGenerator implements SiteGenerator {
  public async generate(nodes: AnyNode[]): Promise<SiteFile[]> {
    const files: SiteFile[] = [];

    // Generate index page
    files.push({
      path: 'index.html',
      content: this.generateIndex(nodes),
    });

    // Generate individual node pages
    for (const node of nodes) {
      files.push({
        path: `nodes/${node.id}.html`,
        content: this.generateNodePage(node, nodes),
      });
    }

    // Generate graph view
    files.push({
      path: 'graph-data.js',
      content: this.generateGraphData(nodes),
    });

    files.push({
      path: 'graph.html',
      content: this.generateGraphPage(),
    });

    // Generate CSS
    files.push({
      path: 'styles.css',
      content: this.generateCSS(),
    });

    return files;
  }

  private escapeHtml(text: string): string {
    if (text === undefined || text === null) {
      return '';
    }
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };
    return text.replace(/[&<>"']/g, (m) => map[m] || m);
  }

  private isLinkData(data: any): data is LinkData {
    return data && typeof data.url === 'string';
  }

  private isFlashcardData(data: any): data is FlashcardData {
    return (
      data && typeof data.front === 'string' && typeof data.back === 'string'
    );
  }

  private isContentData(data: any): data is ContentData {
    return data && typeof data.content === 'string';
  }

  private generateIndex(nodes: AnyNode[]): string {
    const nodesByType = nodes.reduce(
      (acc, node) => {
        if (!acc[node.type]) {
          acc[node.type] = [];
        }
        acc[node.type]!.push(node);
        return acc;
      },
      {} as Record<string, AnyNode[]>
    );

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Knowledge Graph</title>
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <header>
        <nav>
            <a href="graph.html">Graph view</a>
        </nav>
        <h1>Knowledge Graph</h1>
        <p>${nodes.length} nodes published</p>
    </header>
    
    <main>
        ${Object.entries(nodesByType)
          .map(
            ([type, typeNodes]) => `
        <section class="node-section">
            <h2>${this.capitalize(type)}s</h2>
            <div class="node-grid">
                ${typeNodes.map((node) => this.renderNodeCard(node)).join('')}
            </div>
        </section>
        `
          )
          .join('')}
    </main>
</body>
</html>`;
  }

  private generateNodePage(node: AnyNode, allNodes: AnyNode[]): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${node.type}: ${this.getNodeTitle(node)}</title>
    <link rel="stylesheet" href="../styles.css">
</head>
<body>
    <header>
        <nav>
            <a href="../index.html">← Back to Index</a>
        </nav>
    </header>

    <main>
        <article class="node-detail">
            <div class="node-meta">
                <span class="node-type">${node.type}</span>
                <time>${node.createdAt.toLocaleDateString()}</time>
            </div>

            <h1>${this.getNodeTitle(node)}</h1>
            <p class="node-id">${node.id}</p>

            ${this.renderNodeContent(node)}
        </article>

        ${this.renderRelatedNodes(node, allNodes)}
    </main>
</body>
</html>`;
  }

  private renderNodeCard(node: AnyNode): string {
    const summary = this.getNodeSummary(node);
    return `
    <a href="nodes/${node.id}.html" class="node-card">
        <div class="node-type-badge">${node.type}</div>
        <h3>${this.getNodeTitle(node)}</h3>
        <p class="node-id">${node.id}</p>
        ${summary ? `<p>${summary}</p>` : ''}
    </a>`;
  }

  private renderNodeContent(node: AnyNode): string {
    switch (node.type) {
      case 'note':
        const content = (node as any).content;
        if (content && typeof content === 'string') {
          const html = marked.parse(this.escapeHtml(content));
          return `
        <div class="note-content">
            ${html}
        </div>`;
        }
        break;

      case 'link':
        const linkData = (node as any).data;
        if (linkData && linkData.url) {
          if (linkData.crawled && linkData.crawled.html) {
            return `
        <div class="link-content">
            ${linkData.crawled.html}
        </div>`;
          }
          return `
        <div class="link-content">
            <a href="${this.escapeHtml(
              linkData.url
            )}" target="_blank" rel="noopener">
                ${this.escapeHtml(linkData.url)}
            </a>
        </div>`;
        }
        break;

      case 'flashcard':
        const flashcardData = (node as any).data;
        if (flashcardData && flashcardData.front && flashcardData.back) {
          return `
        <div class="flashcard-content">
            <div class="flashcard-front">
                <strong>Front:</strong> ${this.escapeHtml(flashcardData.front)}
            </div>
            <div class="flashcard-back">
                <strong>Back:</strong> ${this.escapeHtml(flashcardData.back)}
            </div>
        </div>`;
        }
        break;

      case 'tag':
        const tagData = (node as any).data;
        if (tagData && tagData.name) {
          return `
        <div class="tag-content">
            <p>Tag: <strong>${this.escapeHtml(tagData.name)}</strong></p>
            ${tagData.description ? `<p>${this.escapeHtml(tagData.description)}</p>` : ''}
        </div>`;
        }
        break;
    }

    // Fallback for invalid data
    return `<pre>${this.escapeHtml('No content available')}</pre>`;
  }

  private renderRelatedNodes(node: AnyNode, allNodes: AnyNode[]): string {
    // TODO: Implement relationship discovery via tag nodes when tag relationships are implemented
    return '';
  }

  private getNodeTitle(node: AnyNode): string {
    return this.escapeHtml(this.getNodeTitleText(node));
  }

  private getNodeTitleText(node: AnyNode): string {
    if (
      node.title &&
      typeof node.title === 'string' &&
      node.title.trim().length > 0
    ) {
      return node.title;
    }

    switch (node.type) {
      case 'link':
        const linkData = (node as any).data;
        if (linkData && linkData.url) {
          try {
            return new URL(linkData.url).hostname;
          } catch {
            return linkData.url.slice(0, 50);
          }
        }
        break;
      case 'flashcard':
        const flashcardData = (node as any).data;
        if (flashcardData && flashcardData.front) {
          return flashcardData.front.slice(0, 50);
        }
        break;
    }
    return node.id.slice(0, 8);
  }

  private getNodeSummary(node: AnyNode): string {
    switch (node.type) {
      case 'link':
        const linkData = (node as any).data;
        if (linkData && linkData.url) {
          return linkData.url;
        }
        break;
      case 'flashcard':
        // Flashcards already use their title for the question, so no preview is needed
        break;
    }
    return '';
  }

  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  private truncate(text: string, length: number): string {
    return text.length > length ? `${text.slice(0, length - 1)}…` : text;
  }

  private getNodeColor(type: NodeType): string {
    const colors: Record<NodeType, string> = {
      note: '#0066cc',
      link: '#ff6b6b',
      tag: '#2ca02c',
      flashcard: '#8e44ad',
    };
    return colors[type];
  }

  private generateGraphData(nodes: AnyNode[]): string {
    const graphNodes: GraphNodeData[] = nodes.map((node) => ({
      id: node.id,
      label: this.truncate(this.getNodeTitleText(node), 20),
      type: node.type,
      color: this.getNodeColor(node.type),
    }));

    const edges: GraphEdgeData[] = [];
    const seen = new Set<string>();

    for (const node of nodes) {
      for (const rel of node.relatedNodes) {
        let source: string;
        let target: string;
        let bidirectional = false;

        if (rel.relationship.direction === 'both') {
          const [a, b] =
            node.id < rel.node.id ? [node.id, rel.node.id] : [rel.node.id, node.id];
          const key = `${a}|${b}|${rel.relationship.type}|both`;
          if (seen.has(key)) continue;
          seen.add(key);
          source = a;
          target = b;
          bidirectional = true;
        } else {
          source = rel.relationship.direction === 'from' ? node.id : rel.node.id;
          target = rel.relationship.direction === 'from' ? rel.node.id : node.id;
          const key = `${source}|${target}|${rel.relationship.type}`;
          if (seen.has(key)) continue;
          seen.add(key);
        }

        edges.push({
          id: `${source}_${target}_${rel.relationship.type}`,
          source,
          target,
          label: rel.relationship.type,
          bidirectional,
        });
      }
    }

    return `window.graphData = ${JSON.stringify({ nodes: graphNodes, edges }, null, 2)};`;
  }

  private generateGraphPage(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Knowledge Graph - Network</title>
    <link rel="stylesheet" href="styles.css">
    <style>
      #cy { width: 100%; height: 800px; border: 1px solid var(--border); border-radius: 8px; }
      .legend { margin-top: 1rem; font-size: 0.9rem; }
      .legend-item { display: flex; align-items: center; margin-bottom: 4px; }
      .legend-color { width: 12px; height: 12px; border-radius: 2px; margin-right: 6px; display: inline-block; }
      .faded { opacity: 0.1; }
    </style>
    <script src="https://unpkg.com/cytoscape@3.26.0/dist/cytoscape.min.js"></script>
    <script src="graph-data.js"></script>
</head>
<body>
    <header>
        <nav>
            <a href="index.html">← Back to Index</a>
        </nav>
    </header>

    <main>
        <div id="cy"></div>
        <div id="legend" class="legend">
          <div class="legend-item"><span class="legend-color" style="background:#0066cc"></span> Note</div>
          <div class="legend-item"><span class="legend-color" style="background:#ff6b6b"></span> Link</div>
          <div class="legend-item"><span class="legend-color" style="background:#2ca02c"></span> Tag</div>
          <div class="legend-item"><span class="legend-color" style="background:#8e44ad"></span> Flashcard</div>
        </div>
    </main>

    <script>
      const cy = cytoscape({
        container: document.getElementById('cy'),
        elements: {
          nodes: window.graphData.nodes.map((n) => ({ data: n })),
          edges: window.graphData.edges.map((e) => ({ data: e })),
        },
        layout: { name: 'cose', idealEdgeLength: 200, nodeRepulsion: 1000000, padding: 50 },
        style: [
          {
            selector: 'node',
            style: {
              'background-color': 'data(color)',
              label: 'data(label)',
              'text-wrap': 'wrap',
              'text-max-width': '80px',
              'font-size': '10px',
              'text-valign': 'center',
              color: '#333333',
            },
          },
          {
            selector: 'edge',
            style: {
              'curve-style': 'bezier',
              'line-color': '#999999',
              'target-arrow-color': '#999999',
              'source-arrow-color': '#999999',
              'target-arrow-shape': 'triangle',
              width: 1,
              'text-rotation': 'autorotate',
              label: 'data(label)',
              'font-size': '8px',
              'text-background-opacity': 1,
              'text-background-color': '#ffffff',
              'text-background-padding': '2px',
            },
          },
          {
            selector: 'edge[bidirectional]',
            style: {
              'source-arrow-shape': 'triangle',
            },
          },
          {
            selector: '.faded',
            style: { opacity: 0.1 },
          },
        ],
      });

      cy.on('layoutstop', () => {
        cy.fit(undefined, 50);
        cy.zoom(cy.zoom() * 0.9);
      });

      cy.on('tap', 'node', (evt) => {
        const node = evt.target;
        cy.elements().addClass('faded');
        node.removeClass('faded');
        node.connectedEdges().removeClass('faded');
        node.connectedEdges().connectedNodes().removeClass('faded');
      });

      cy.on('tap', (evt) => {
        if (evt.target === cy) {
          cy.elements().removeClass('faded');
        }
      });
    </script>
</body>
</html>`;
  }

  private generateCSS(): string {
    return `
:root {
  --bg: #ffffff;
  --text: #333333;
  --primary: #0066cc;
  --border: #e0e0e0;
  --card-bg: #f9f9f9;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  line-height: 1.6;
  color: var(--text);
  background: var(--bg);
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
}

header {
  margin-bottom: 3rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid var(--border);
}

h1 { font-size: 2.5rem; margin-bottom: 0.5rem; }
h2 { font-size: 1.8rem; margin: 2rem 0 1rem; }

.node-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.5rem;
  margin-bottom: 3rem;
}

.node-card {
  display: block;
  padding: 1.5rem;
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: 8px;
  text-decoration: none;
  color: var(--text);
  transition: transform 0.2s, box-shadow 0.2s;
}

.node-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}

.node-type-badge {
  display: inline-block;
  padding: 0.25rem 0.5rem;
  background: var(--primary);
  color: white;
  border-radius: 4px;
  font-size: 0.75rem;
  text-transform: uppercase;
  margin-bottom: 0.5rem;
}

.node-id {
  font-size: 0.75rem;
  color: #666666;
  margin-bottom: 0.5rem;
}


.flashcard-content {
  display: grid;
  gap: 1rem;
  margin: 1.5rem 0;
}

.flashcard-front, .flashcard-back {
  padding: 1rem;
  background: var(--card-bg);
  border-radius: 8px;
}

nav a {
  color: var(--primary);
  text-decoration: none;
}

nav a:hover {
  text-decoration: underline;
}
`;
  }
}
