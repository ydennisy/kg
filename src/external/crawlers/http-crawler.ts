import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';
import type { Crawler, CrawlResult } from '../../application/ports/crawler.js';

class HTTPCrawler implements Crawler {
  public async fetch(url: string): Promise<CrawlResult> {
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'User-Agent': '' },
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
    };
  }
}

export { HTTPCrawler };
