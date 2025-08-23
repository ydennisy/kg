import { marked } from 'marked';
import type { AnyNode } from '../../domain/node.js';
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
    if (
      node.title &&
      typeof node.title === 'string' &&
      node.title.trim().length > 0
    ) {
      return this.escapeHtml(node.title);
    }

    // Fallback to previous heuristics if title is missing
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
