import { describe, test, beforeEach, afterEach, expect } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { migrate } from 'drizzle-orm/libsql/migrator';
import { randomUUID } from 'node:crypto';
import { AjvValidator } from '../../external/validation/ajv-validator.js';
import { NodeFactory } from '../../domain/node-factory.js';
import type { JSONSchema } from '../../domain/ports/validator.js';
import { NodeMapper } from '../../adapters/node-mapper.js';
import { SqlNodeRepository } from '../../external/repositories/sql-node-repository.js';
import { HTMLGenerator } from '../../external/publishers/html-generator.js';
import { PublishSiteUseCase } from './publish-site.js';
import { createDatabaseClient, type DatabaseClient } from '../../external/database/client.js';

let db: DatabaseClient;
let factory: NodeFactory;
let repository: SqlNodeRepository;
let outputDir: string;

beforeEach(async () => {
  db = createDatabaseClient(':memory:');
  await migrate(db, { migrationsFolder: './drizzle' });

  const validator = new AjvValidator();
  factory = new NodeFactory(validator);

  const noteSchema = {
    type: 'object',
    properties: { content: { type: 'string' } },
    required: ['content'],
    additionalProperties: false,
  } satisfies JSONSchema;

  const linkSchema = {
    type: 'object',
    properties: {
      url: { type: 'string' },
      text: { type: 'string' },
      html: { type: 'string' },
    },
    required: ['url', 'text', 'html'],
    additionalProperties: false,
  } satisfies JSONSchema;

  const tagSchema = {
    type: 'object',
    properties: { name: { type: 'string' } },
    required: ['name'],
    additionalProperties: false,
  } satisfies JSONSchema;

  const flashcardSchema = {
    type: 'object',
    properties: { front: { type: 'string' }, back: { type: 'string' } },
    required: ['front', 'back'],
    additionalProperties: false,
  } satisfies JSONSchema;

  factory.registerSchema('note', noteSchema);
  factory.registerSchema('link', linkSchema);
  factory.registerSchema('tag', tagSchema);
  factory.registerSchema('flashcard', flashcardSchema);

  const mapper = new NodeMapper(factory);
  repository = new SqlNodeRepository(db, mapper);

  outputDir = await fs.mkdtemp(path.join(os.tmpdir(), 'publish-test-'));
});

afterEach(async () => {
  await fs.rm(outputDir, { recursive: true, force: true });
});

describe('PublishSiteUseCase', () => {
  test('publishes only public nodes and generates correct files', async () => {
    const publicNote = factory.createNode('note', 'Public Note', true, { content: 'hello' });
    const privateNote = factory.createNode('note', 'Private Note', false, { content: 'secret' });
    await repository.save(publicNote);
    await repository.save(privateNote);

    const useCase = new PublishSiteUseCase(repository, new HTMLGenerator(), outputDir);
    const result = await useCase.execute();
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
    const note = factory.createNode('note', 'Note', true, {
      content: 'note content',
    });
    const link = factory.createNode('link', 'My Link', true, {
      url: 'https://example.com',
      text: 'Example',
      html: '<p>Example</p>',
    });
    const tag = factory.createNode('tag', 'Taggy', true, { name: 'taggy' });
    const flashcard = factory.createNode('flashcard', 'Card', true, {
      front: 'front side',
      back: 'back side',
    });
    for (const n of [note, link, tag, flashcard]) {
      await repository.save(n);
    }

    const useCase = new PublishSiteUseCase(repository, new HTMLGenerator(), outputDir);
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
    expect(tagHtml).toContain('taggy');

    const flashHtml = await fs.readFile(path.join(outputDir, 'nodes', `${flashcard.id}.html`), 'utf8');
    expect(flashHtml).toContain('Front:');
    expect(flashHtml).toContain('Back:');
  });

  test('renders markdown content for note nodes', async () => {
    const note = factory.createNode('note', 'MD Note', true, {
      content: '# Title\n\nA **bold** move.',
    });
    await repository.save(note);

    const useCase = new PublishSiteUseCase(repository, new HTMLGenerator(), outputDir);
    await useCase.execute();

    const html = await fs.readFile(
      path.join(outputDir, 'nodes', `${note.id}.html`),
      'utf8'
    );
    expect(html).toContain('<h1>Title</h1>');
    expect(html).toContain('<p>A <strong>bold</strong> move.</p>');
  });

  test('escapes HTML special characters', async () => {
    const evil = factory.createNode('note', 'Evil', true, {
      content: '<script>bad()</script>',
    });
    await repository.save(evil);

    const useCase = new PublishSiteUseCase(repository, new HTMLGenerator(), outputDir);
    await useCase.execute();

    const page = await fs.readFile(path.join(outputDir, 'nodes', `${evil.id}.html`), 'utf8');
    expect(page).toContain('&lt;script&gt;bad()&lt;/script&gt;');
  });

  test('renders createdAt dates correctly', async () => {
    const date = new Date('2020-01-02T00:00:00Z');
    const node = factory.hydrateNode(
      randomUUID(),
      'note',
      'Dated',
      true,
      date,
      date,
      { content: 'dated note' }
    );
    await repository.save(node);

    const useCase = new PublishSiteUseCase(repository, new HTMLGenerator(), outputDir);
    await useCase.execute();

    const html = await fs.readFile(path.join(outputDir, 'nodes', `${node.id}.html`), 'utf8');
    expect(html).toContain(date.toLocaleDateString());
  });

  test('handles when no public nodes exist', async () => {
    const privateNode = factory.createNode('note', 'Private', false, { content: 'secret' });
    await repository.save(privateNode);

    const useCase = new PublishSiteUseCase(repository, new HTMLGenerator(), outputDir);
    await useCase.execute();

    const files = await fs.readdir(outputDir);
    expect(files.sort()).toEqual(['index.html', 'styles.css']);

    const index = await fs.readFile(path.join(outputDir, 'index.html'), 'utf8');
    expect(index).toContain('0 nodes published');
  });
});

