import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';
import TurndownService from 'turndown';
import type { Crawler, CrawlResult } from '../../application/ports/crawler.js';

class HTTPCrawler implements Crawler {
  public async fetch(url: string): Promise<CrawlResult> {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to crawl website');
    }

    const html = await response.text();
    const doc = new JSDOM(html, {
      url,
    });
    const reader = new Readability(doc.window.document);
    const parsed = reader.parse();

    if (!parsed) {
      throw new Error('Failed to parse website');
    }

    return {
      url,
      title: parsed.title ?? undefined,
      html: parsed.content ?? undefined,
      text: parsed.textContent ?? undefined,
      markdown: parsed.content
        ? this.formatAsMarkdown(parsed.content)
        : undefined,
    };
  }

  private formatAsMarkdown(html: string) {
    const turndownService = new TurndownService();
    return turndownService.turndown(html);
  }
}

export { HTTPCrawler };
