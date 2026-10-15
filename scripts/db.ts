/**
 * The commands that make the development database disposable: seed it, or
 * delete it so migrations can rebuild it. They only ever touch a local SQLite
 * file — production is a hosted Turso database and is out of their reach.
 *
 * Usage: tsx scripts/db.ts <command>
 */
import { createClient } from '@libsql/client';
import { loadEnvConfig } from '@next/env';
import fs from 'node:fs';
import path from 'node:path';

/**
 * The development database file. Refuses anything but a local `file:` URL, so
 * a stray Turso URL in `.env.development.local` cannot be seeded over.
 */
function developmentFile(what: string) {
  loadEnvConfig(process.cwd(), true, console, true);
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set for development');
  if (!url.startsWith('file:')) {
    throw new Error(
      `Development points at a remote database (${url.split('?')[0]}). ` +
        `Refusing to ${what} — these commands are for the local file only.`,
    );
  }
  return path.resolve(url.slice('file:'.length).split('?')[0]);
}

async function resetDev() {
  const file = developmentFile('reset');

  for (const sidecar of ['', '-wal', '-shm']) {
    fs.rmSync(`${file}${sidecar}`, { force: true });
  }
  console.log(
    `Deleted ${path.relative(process.cwd(), file)} — run \`pnpm db:migrate\` to recreate it.`,
  );
}

const DAY_SECONDS = 24 * 60 * 60;

/**
 * Enough cards to search and enough due cards to drill, with the scheduling
 * state spread across the states the app can be in: brand new, mid-learning,
 * comfortably graduated, and one card that has been forgotten twice. `due` is
 * in days from now, so negatives are waiting in the queue.
 */
const SEED = [
  {
    tags: ['linear-algebra', 'math'],
    cards: [
      {
        front: 'What does the determinant of a $2 \\times 2$ matrix measure?',
        back: 'The factor by which the map scales area.\n\n$$\\det\\begin{pmatrix}a & b\\\\ c & d\\end{pmatrix} = ad - bc$$',
        due: -1,
        reps: 2,
        interval: 3,
        ease: 2.5,
      },
      {
        front: 'When is a linear map invertible?',
        back: 'Exactly when its determinant is non-zero.',
        due: 0,
        reps: 0,
        interval: 0,
        ease: 2.5,
      },
      {
        front: 'What is an eigenvector?',
        back: 'A non-zero vector that a linear map only scales: $Av = \\lambda v$.',
        due: 5,
        reps: 3,
        interval: 8,
        ease: 2.5,
      },
    ],
  },
  {
    tags: ['spanish'],
    cards: [
      {
        front: 'to be (permanent)',
        back: 'ser',
        due: -3,
        reps: 6,
        interval: 21,
        ease: 2.6,
      },
      {
        front: 'to be (state, location)',
        back: 'estar',
        due: -1,
        reps: 4,
        interval: 8,
        ease: 2.5,
      },
      {
        front: 'to have',
        back: 'tener',
        due: -0.5,
        reps: 3,
        interval: 3,
        ease: 2.35,
      },
      { front: 'to go', back: 'ir', due: 2, reps: 5, interval: 12, ease: 2.5 },
      {
        front: 'to know (a fact)',
        back: 'saber',
        due: 9,
        reps: 7,
        interval: 34,
        ease: 2.7,
      },
      {
        front: 'to know (a person, a place)',
        back: 'conocer',
        due: 0,
        reps: 1,
        interval: 1,
        ease: 2.5,
        lapses: 2,
      },
      {
        front: 'to bring',
        back: 'traer',
        due: 0,
        reps: 0,
        interval: 0,
        ease: 2.5,
      },
      {
        front: 'to fit',
        back: 'caber',
        due: 0,
        reps: 0,
        interval: 0,
        ease: 2.5,
      },
    ],
  },
  {
    tags: ['http'],
    cards: [
      {
        front: '201',
        back: 'Created — and the response carries a Location header',
        due: -2,
        reps: 4,
        interval: 10,
        ease: 2.5,
      },
      {
        front: '204',
        back: 'No Content',
        due: -1,
        reps: 3,
        interval: 5,
        ease: 2.5,
      },
      {
        front: '301 vs 308',
        back: 'Both permanent; 308 keeps the method and body, 301 lets clients rewrite POST to GET',
        due: 0,
        reps: 2,
        interval: 2,
        ease: 2.2,
      },
      {
        front: '409',
        back: 'Conflict — the request clashes with the current state of the resource',
        due: 4,
        reps: 5,
        interval: 15,
        ease: 2.55,
      },
      {
        front: '422',
        back: 'Unprocessable Content — syntactically fine, semantically wrong',
        due: 0,
        reps: 0,
        interval: 0,
        ease: 2.5,
      },
      {
        front: '429',
        back: 'Too Many Requests — pair it with Retry-After',
        due: 0,
        reps: 0,
        interval: 0,
        ease: 2.5,
      },
    ],
  },
  {
    tags: ['sqlite', 'databases'],
    cards: [
      {
        front: 'What does VACUUM INTO do?',
        back: 'Writes a consistent copy of the database to a new file, safe to run while the database is in use',
        due: -1,
        reps: 2,
        interval: 4,
        ease: 2.5,
      },
      {
        front: 'What does WAL mode change?',
        back: 'Writers append to a write-ahead log instead of rewriting pages, so readers no longer block on a writer',
        due: 0,
        reps: 1,
        interval: 1,
        ease: 2.5,
      },
      {
        front: 'unixepoch()',
        back: 'Current time as seconds since 1970 — how every timestamp in this schema is defaulted',
        due: 6,
        reps: 4,
        interval: 18,
        ease: 2.6,
      },
      {
        front: 'Is a column type enforced?',
        back: 'No, unless the table is declared STRICT — SQLite applies type affinity instead',
        due: 0,
        reps: 0,
        interval: 0,
        ease: 2.5,
      },
    ],
  },
];

/** Notes and links, tagged so that they turn up as "related" mid-drill. */
const NOTES = [
  {
    kind: 'note',
    title: 'Linear algebra, chapter map',
    body: 'Vectors → span → linear maps → determinants → eigen.\n\nThe determinant is area scaling; **zero means the map squashes space**.',
    tags: ['linear-algebra'],
    age: 12,
  },
  {
    kind: 'note',
    title: 'ser vs estar',
    body: '- **ser**: what something *is* — identity, origin, time\n- **estar**: how or where it is — state, location',
    tags: ['spanish'],
    age: 4,
  },
  {
    kind: 'note',
    title: 'Status code families',
    body: '`2xx` worked, `3xx` look elsewhere, `4xx` your fault, `5xx` ours.',
    tags: ['http'],
    age: 2,
  },
  {
    kind: 'link',
    title: 'Essence of linear algebra',
    url: 'https://www.3blue1brown.com/topics/linear-algebra',
    body: 'Watch chapter 6 before eigenvectors.',
    tags: ['linear-algebra', 'math'],
    age: 9,
  },
  {
    kind: 'link',
    title: 'HTTP response status codes',
    url: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Status',
    body: '',
    tags: ['http'],
    age: 6,
  },
  {
    kind: 'link',
    title: 'SQLite: Write-Ahead Logging',
    url: 'https://www.sqlite.org/wal.html',
    body: '',
    tags: ['sqlite', 'databases'],
    age: 1,
  },
];

/**
 * Replaces the contents of the development database. Destructive by design:
 * dev data is scratch, and a seed you can trust to be identical every time is
 * worth more than whatever was in there.
 */
async function seed() {
  const file = developmentFile('seed');

  if (!fs.existsSync(file)) {
    throw new Error(
      `No database at ${path.relative(process.cwd(), file)}. ` +
        'Run `pnpm db:migrate` first.',
    );
  }

  const client = createClient({ url: `file:${file}` });
  const now = Math.floor(Date.now() / 1000);
  const tagIds = new Map<string, number>();
  let cardCount = 0;

  async function tag(name: string): Promise<number> {
    if (!tagIds.has(name)) {
      const { lastInsertRowid } = await client.execute({
        sql: 'INSERT INTO tags (name, created_at) VALUES (?, ?)',
        args: [name, now - 30 * DAY_SECONDS],
      });
      tagIds.set(name, Number(lastInsertRowid));
    }
    return tagIds.get(name)!;
  }

  try {
    await client.execute('PRAGMA foreign_keys = ON');
    // reviews and the tag links go with their parents via ON DELETE CASCADE.
    for (const table of ['decks', 'cards', 'notes', 'tags']) {
      await client.execute(`DELETE FROM ${table}`);
    }
    await client.execute(
      "DELETE FROM sqlite_sequence WHERE name IN ('decks', 'cards', 'reviews', 'notes', 'tags')",
    );

    for (const group of SEED) {
      for (const [index, card] of group.cards.entries()) {
        const reps = card.reps ?? 0;
        const interval = card.interval ?? 0;
        const { lastInsertRowid: cardId } = await client.execute({
          sql: `INSERT INTO cards
                  (front, back, due_at, interval_raw, interval_days,
                   ease_factor, reps, lapses, last_reviewed_at, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            card.front,
            card.back,
            now + Math.round(card.due * DAY_SECONDS),
            interval,
            interval,
            card.ease ?? 2.5,
            reps,
            card.lapses ?? 0,
            reps > 0
              ? now - Math.round((interval - card.due) * DAY_SECONDS)
              : null,
            now - (30 - cardCount) * DAY_SECONDS + index,
          ],
        });
        for (const name of group.tags) {
          await client.execute({
            sql: 'INSERT INTO card_tags (card_id, tag_id) VALUES (?, ?)',
            args: [Number(cardId), await tag(name)],
          });
        }
        cardCount += 1;
      }
    }

    for (const note of NOTES) {
      const { lastInsertRowid: noteId } = await client.execute({
        sql: 'INSERT INTO notes (kind, title, body, url, created_at) VALUES (?, ?, ?, ?, ?)',
        args: [
          note.kind,
          note.title,
          note.body,
          note.url ?? null,
          now - note.age * DAY_SECONDS,
        ],
      });
      for (const name of note.tags) {
        await client.execute({
          sql: 'INSERT INTO note_tags (note_id, tag_id) VALUES (?, ?)',
          args: [Number(noteId), await tag(name)],
        });
      }
    }
  } finally {
    client.close();
  }

  const due = SEED.flatMap((group) => group.cards).filter(
    (card) => card.due <= 0,
  );
  console.log(
    `Seeded ${path.relative(process.cwd(), file)}: ` +
      `${cardCount} cards, ${NOTES.length} notes and links, ` +
      `${tagIds.size} tags, ${due.length} due now.`,
  );
}

const commands: Record<string, () => Promise<void>> = {
  'reset-dev': resetDev,
  seed,
};
const command = commands[process.argv[2]];

if (!command) {
  console.error(
    `Usage: tsx scripts/db.ts <${Object.keys(commands).join('|')}>`,
  );
  process.exit(1);
}

command().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
