type CrawlResult = {
  url: string;
  title: string | undefined;
  html: string | undefined;
  text: string | undefined;
  markdown: string | undefined;
};

interface Crawler {
  fetch(url: string): Promise<CrawlResult>;
}

export type { Crawler, CrawlResult };
