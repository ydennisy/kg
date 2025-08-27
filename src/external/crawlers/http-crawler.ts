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
      throw new Error(`Failed to fetch (${response.status})`);
    }

    const html = await response.text();
    const doc = new JSDOM(html, { url });
    const reader = new Readability(doc.window.document);
    const parsed = reader.parse();

    const title =
      parsed?.title ??
      doc.window.document.querySelector('title')?.textContent ??
      undefined;

    const contentHtml = parsed?.content ?? undefined;
    const text =
      parsed?.textContent ?? doc.window.document.body?.textContent ?? undefined;

    const markdown = contentHtml
      ? this.formatAsMarkdown(contentHtml)
      : undefined;

    return {
      url,
      title,
      html: contentHtml,
      text,
      markdown,
    };
  }

  private formatAsMarkdown(html: string) {
    const turndownService = new TurndownService();
    return turndownService.turndown(html);
  }
}

export { HTTPCrawler };
