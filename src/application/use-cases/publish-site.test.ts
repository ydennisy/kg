import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { describe, test, beforeEach, afterEach, expect } from 'vitest';
import { migrate } from 'drizzle-orm/libsql/migrator';
import { NodeMapper } from '../../adapters/node-mapper.js';
import { NoteNode } from '../../domain/note-node.js';
import { LinkNode } from '../../domain/link-node.js';
import { TagNode } from '../../domain/tag-node.js';
import { FlashcardNode } from '../../domain/flashcard-node.js';
import { SqliteNodeRepository } from '../../external/repositories/sqlite-node-repository.js';
import { HTMLGenerator } from '../../external/publishers/html-generator.js';
import { PublishSiteUseCase } from './publish-site.js';
import {
  createDatabaseClient,
  type DatabaseClient,
} from '../../external/database/client.js';

describe('PublishSiteUseCase', () => {
  let db: DatabaseClient;
  let repository: SqliteNodeRepository;
  let outputDir: string;
  let dbFile: string;

  beforeEach(async () => {
    // Use a temp file vs in memory to allow for transactions to work
    dbFile = path.join(os.tmpdir(), `${randomUUID()}.db`);
    db = createDatabaseClient(`file:${dbFile}`);
    await migrate(db, { migrationsFolder: './drizzle' });

    const mapper = new NodeMapper();
    repository = new SqliteNodeRepository(db, mapper);

    outputDir = await fs.mkdtemp(path.join(os.tmpdir(), 'publish-test-'));
  });

  afterEach(async () => {
    await fs.rm(outputDir, { recursive: true, force: true });
  });
  test('publishes only public nodes and generates correct files', async () => {
    const publicNote = NoteNode.create({
      title: 'Public Note',
      isPublic: true,
      data: { content: 'hello' },
    });
    const privateNote = NoteNode.create({
      title: 'Private Note',
      isPublic: false,
      data: { content: 'secret' },
    });
    await repository.save(publicNote);
    await repository.save(privateNote);

    const useCase = new PublishSiteUseCase(
      repository,
      new HTMLGenerator(),
      outputDir
    );
    const result = await useCase.execute();
    if (!result.ok) {
      console.error('PublishSiteUseCase error:', result.error);
    }
    expect(result.ok).toBe(true);

    const files = await fs.readdir(outputDir);
    expect(files.sort()).toEqual(['index.html', 'nodes', 'styles.css']);

    const nodeFiles = await fs.readdir(path.join(outputDir, 'nodes'));
    expect(nodeFiles).toEqual([`${publicNote.id}.html`]);

    const index = await fs.readFile(path.join(outputDir, 'index.html'), 'utf8');
    expect(index).toContain('1 nodes published');
    expect(index).toContain(`nodes/${publicNote.id}.html`);
    expect(index).toContain(publicNote.title);
    expect(index).toContain(`<p class="node-id">${publicNote.id}</p>`);
    expect(index).not.toContain(privateNote.title);
  });

  test('generates correct HTML for each node type', async () => {
    const note = NoteNode.create({
      title: 'Note',
      isPublic: true,
      data: { content: 'note content' },
    });
    const link = LinkNode.create({
      title: 'My Link',
      isPublic: true,
      data: {
        url: 'https://example.com',
        crawled: {
          title: 'Example',
          text: 'Example',
          html: '<p>Example</p>',
        },
      },
    });
    const tag = TagNode.create({
      isPublic: true,
      data: { name: '#tag1', description: 'a description of the tag' },
    });
    const flashcard = FlashcardNode.create({
      isPublic: true,
      data: { front: 'front side', back: 'back side' },
    });
    for (const n of [note, link, tag, flashcard]) {
      await repository.save(n);
    }

    const useCase = new PublishSiteUseCase(
      repository,
      new HTMLGenerator(),
      outputDir
    );
    await useCase.execute();

    const index = await fs.readFile(path.join(outputDir, 'index.html'), 'utf8');
    expect(index).toContain('4 nodes published');
    expect(index).toContain('Notes');
    expect(index).toContain('Links');
    expect(index).toContain('Tags');
    expect(index).toContain('Flashcards');

    const noteHtml = await fs.readFile(
      path.join(outputDir, 'nodes', `${note.id}.html`),
      'utf8'
    );
    expect(noteHtml).toContain(`<h1>${note.title}</h1>`);
    expect(noteHtml).toContain(`<p class="node-id">${note.id}</p>`);
    expect(noteHtml).toContain('<div class="note-content">');
    expect(noteHtml).toContain('<p>note content</p>');

    const linkHtml = await fs.readFile(
      path.join(outputDir, 'nodes', `${link.id}.html`),
      'utf8'
    );
    expect(linkHtml).toContain('<p>Example</p>');

    const tagHtml = await fs.readFile(
      path.join(outputDir, 'nodes', `${tag.id}.html`),
      'utf8'
    );

    expect(tagHtml).toContain('#tag1');
    expect(tagHtml).toContain('a description of the tag');

    const flashHtml = await fs.readFile(
      path.join(outputDir, 'nodes', `${flashcard.id}.html`),
      'utf8'
    );
    expect(flashHtml).toContain('Front:');
    expect(flashHtml).toContain('Back:');
  });

  test('renders markdown content for note nodes', async () => {
    const note = NoteNode.create({
      title: 'MD Note',
      isPublic: true,
      data: { content: '# Title\n\nA **bold** move.' },
    });
    await repository.save(note);

    const useCase = new PublishSiteUseCase(
      repository,
      new HTMLGenerator(),
      outputDir
    );
    await useCase.execute();

    const html = await fs.readFile(
      path.join(outputDir, 'nodes', `${note.id}.html`),
      'utf8'
    );
    expect(html).toContain('<h1>Title</h1>');
    expect(html).toContain('<p>A <strong>bold</strong> move.</p>');
  });

  test('escapes HTML special characters', async () => {
    const evil = NoteNode.create({
      title: 'Evil',
      isPublic: true,
      data: { content: '<script>bad()</script>' },
    });
    await repository.save(evil);

    const useCase = new PublishSiteUseCase(
      repository,
      new HTMLGenerator(),
      outputDir
    );
    await useCase.execute();

    const page = await fs.readFile(
      path.join(outputDir, 'nodes', `${evil.id}.html`),
      'utf8'
    );
    expect(page).toContain('&lt;script&gt;bad()&lt;/script&gt;');
  });

  test('renders createdAt dates correctly', async () => {
    const date = new Date('2020-01-02T00:00:00Z');
    const node = NoteNode.hydrate({
      id: randomUUID(),
      version: 1,
      title: 'Dated',
      isPublic: true,
      createdAt: date,
      updatedAt: date,
      data: { content: 'dated note' },
    });
    await repository.save(node);

    const useCase = new PublishSiteUseCase(
      repository,
      new HTMLGenerator(),
      outputDir
    );
    await useCase.execute();

    const html = await fs.readFile(
      path.join(outputDir, 'nodes', `${node.id}.html`),
      'utf8'
    );
    expect(html).toContain(date.toLocaleDateString());
  });

  test('handles when no public nodes exist', async () => {
    const privateNode = NoteNode.create({
      title: 'Private',
      isPublic: false,
      data: { content: 'secret' },
    });
    await repository.save(privateNode);

    const useCase = new PublishSiteUseCase(
      repository,
      new HTMLGenerator(),
      outputDir
    );
    await useCase.execute();

    const files = await fs.readdir(outputDir);
    expect(files.sort()).toEqual(['index.html', 'styles.css']);

    const index = await fs.readFile(path.join(outputDir, 'index.html'), 'utf8');
    expect(index).toContain('0 nodes published');
  });
});
