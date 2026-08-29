#!/usr/bin/env node
/**
 * Database maintenance: backups of production, and the commands that make the
 * development database disposable — seed it, reset it, or fill it with a copy
 * of production. Deliberately separate from the app and from drizzle-kit so
 * that the only tool allowed to write to production is a reviewed migration.
 *
 * Usage: node scripts/db.mjs <command>
 */
import { createClient } from '@libsql/client';
import nextEnv from '@next/env'; // CommonJS: no named ESM exports
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const { loadEnvConfig } = nextEnv;

const BACKUP_DIR = path.resolve('data/backups');
const PREFIX = 'prod-';
const SUFFIX = '.db';

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/**
 * Grandfather-father-son retention. A flat "keep the newest N" is the wrong
 * shape once backups are hourly: a day of them evicts every copy from before
 * the damage you have only just noticed. Each tier keeps the newest snapshot
 * per bucket, so recent history stays dense and old history stays reachable.
 */
export const RETENTION = [
  { label: 'hourly', within: 2 * DAY, bucket: HOUR },
  { label: 'daily', within: 30 * DAY, bucket: DAY },
  { label: 'weekly', within: Infinity, bucket: 7 * DAY },
];

/** Resolve DATABASE_URL for one environment, the same way Next.js would. */
function databaseUrl(env) {
  loadEnvConfig(process.cwd(), env === 'development', console, true);
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error(`DATABASE_URL is not set for ${env}`);
  return url;
}

/** The local file behind a `file:` URL — these tools are file-only. */
function localFile(url, env) {
  if (!url.startsWith('file:')) {
    throw new Error(
      `${env} is a remote database (${url.split('?')[0]}). This script only ` +
        `handles local SQLite files; use the Turso CLI for a hosted database.`,
    );
  }
  return path.resolve(url.slice('file:'.length).split('?')[0]);
}

/**
 * `VACUUM INTO` rather than a file copy: it is SQLite's own online backup, so
 * it is consistent even if the production server is mid-write, and it leaves
 * no WAL/SHM sidecars behind.
 */
async function snapshot(sourceUrl, destination) {
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.rmSync(destination, { force: true }); // VACUUM INTO refuses to overwrite
  const client = createClient({ url: sourceUrl });
  try {
    await client.execute({ sql: 'VACUUM INTO ?', args: [destination] });
  } finally {
    client.close();
  }
}

function size(file) {
  return `${(fs.statSync(file).size / 1024).toFixed(0)} KB`;
}

function short(file) {
  return path.relative(process.cwd(), file);
}

function ago(date) {
  const minutes = Math.round((Date.now() - date.getTime()) / MINUTE);
  if (minutes < 60) return `${minutes}m ago`;
  if (minutes < 60 * 24) return `${Math.round(minutes / 60)}h ago`;
  return `${Math.round(minutes / (60 * 24))}d ago`;
}

async function backup() {
  const url = databaseUrl('production');
  const file = localFile(url, 'production');

  if (!fs.existsSync(file)) {
    console.log(`No production database at ${file} yet — nothing to back up.`);
    return;
  }

  const label = process.argv[3];
  const destination = path.join(BACKUP_DIR, snapshotName(new Date(), label));
  await snapshot(url, destination);
  await verify(destination);
  console.log(
    `Backed up production → ${short(destination)} (${size(destination)})`,
  );

  prune(BACKUP_DIR);
  mirror(destination);
}

/**
 * `prod-2026-08-29T16-31-03-085Z.db`, or `…Z-before-migrate.db` when the
 * snapshot was taken to make a specific write undoable. ISO order is also
 * filename order, so sorting the directory sorts by time.
 */
export function snapshotName(date, label) {
  const stamp = date.toISOString().replace(/[:.]/g, '-');
  return `${PREFIX}${stamp}${label ? `-${label}` : ''}${SUFFIX}`;
}

const NAME_PATTERN = new RegExp(
  `^${PREFIX}(\\d{4}-\\d{2}-\\d{2}T\\d{2}-\\d{2}-\\d{2}-\\d{3}Z)(?:-([a-z-]+))?\\${SUFFIX}$`,
);

/** `{ at, label }` for a snapshot filename, or null if it is not one. */
export function parseSnapshotName(name) {
  const match = NAME_PATTERN.exec(name);
  if (!match) return null;

  // Undo the filename-safe substitutions: 2026-08-29T16-31-03-085Z.
  const iso = match[1].replace(
    /T(\d{2})-(\d{2})-(\d{2})-(\d{3})Z$/,
    'T$1:$2:$3.$4Z',
  );
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return null;

  return { at, label: match[2] };
}

/** Every snapshot in a directory, newest first. */
export function snapshots(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .map((name) => ({
      name,
      file: path.join(dir, name),
      ...parseSnapshotName(name),
    }))
    .filter((entry) => entry.at)
    .sort((a, b) => b.at - a.at);
}

/**
 * A backup nobody has opened is a rumour, not a backup. `integrity_check` is
 * cheap on files this size and catches a snapshot that copied badly.
 */
async function verify(file) {
  const client = createClient({ url: `file:${file}` });
  try {
    const { rows } = await client.execute('PRAGMA integrity_check');
    const result = rows[0]?.integrity_check;
    if (result !== 'ok') {
      throw new Error(
        `Snapshot ${short(file)} failed integrity_check: ${result}`,
      );
    }
    const { rows: counts } = await client.execute(
      'SELECT (SELECT count(*) FROM decks) AS decks,' +
        ' (SELECT count(*) FROM cards) AS cards,' +
        ' (SELECT count(*) FROM reviews) AS reviews',
    );
    return counts[0];
  } finally {
    client.close();
  }
}

/** Delete the snapshots no retention tier claims. */
export function prune(dir, now = Date.now()) {
  const claimed = new Set();
  const keep = new Set();

  // Newest first, so the first snapshot to land in a bucket is the one kept.
  for (const { name, at, label } of snapshots(dir)) {
    // A labelled snapshot was taken to make one specific write undoable, so it
    // outranks the schedule: an hourly backup half an hour after a migration
    // must not be what evicts the copy from before that migration.
    if (label) {
      keep.add(name);
      continue;
    }

    const age = now - at.getTime();
    const tier = RETENTION.find((candidate) => age <= candidate.within);
    const bucket = `${tier.label}:${Math.floor(at.getTime() / tier.bucket)}`;
    if (claimed.has(bucket)) continue;
    claimed.add(bucket);
    keep.add(name);
  }

  const stale = snapshots(dir).filter(({ name }) => !keep.has(name));
  for (const { file } of stale) fs.rmSync(file);
  if (stale.length) {
    console.log(`Pruned ${stale.length} snapshot(s) from ${short(dir)}.`);
  }
  return [...keep];
}

/**
 * The failure this does not otherwise survive is the disk. Set
 * BACKUP_MIRROR_DIR to somewhere that leaves the machine — an iCloud Drive or
 * Dropbox folder is enough — and every snapshot is copied there and pruned on
 * the same schedule. A mirror that is unavailable warns but never fails the
 * backup: the local copy has already been written.
 */
function mirror(source) {
  const configured = process.env.BACKUP_MIRROR_DIR;
  if (!configured) return;

  const dir = path.resolve(
    configured.startsWith('~')
      ? path.join(os.homedir(), configured.slice(1))
      : configured,
  );

  try {
    fs.mkdirSync(dir, { recursive: true });
    fs.copyFileSync(source, path.join(dir, path.basename(source)));
    console.log(`Mirrored → ${dir}`);
    prune(dir);
  } catch (error) {
    console.warn(
      `Could not mirror to ${dir}: ${error.message}\n` +
        'The local snapshot is fine; fix BACKUP_MIRROR_DIR when convenient.',
    );
  }
}

/**
 * Production → development only. There is no command for the other direction:
 * real data is promoted by using the app, never by overwriting the file.
 */
async function cloneProd() {
  const developmentFile = developmentTarget('clone');
  const productionUrl = databaseUrl('production');

  const temporary = `${developmentFile}.clone`;
  await snapshot(productionUrl, temporary);
  fs.renameSync(temporary, developmentFile);
  for (const sidecar of ['-wal', '-shm']) {
    fs.rmSync(`${developmentFile}${sidecar}`, { force: true });
  }

  console.log(
    `Copied production → ${path.relative(process.cwd(), developmentFile)} (${size(developmentFile)})`,
  );
}

/** Refuse to write anything but the development database. */
function developmentTarget(what) {
  const productionFile = localFile(databaseUrl('production'), 'production');
  const developmentFile = localFile(databaseUrl('development'), 'development');

  if (developmentFile === productionFile) {
    throw new Error(
      `Development and production resolve to the same file. Refusing to ${what}.`,
    );
  }

  return developmentFile;
}

async function resetDev() {
  const developmentFile = developmentTarget('reset');

  for (const sidecar of ['', '-wal', '-shm']) {
    fs.rmSync(`${developmentFile}${sidecar}`, { force: true });
  }
  console.log(
    `Deleted ${path.relative(process.cwd(), developmentFile)} — run \`pnpm db:migrate\` to recreate it.`,
  );
}

const DAY_SECONDS = 24 * 60 * 60;

/**
 * Enough decks to browse and enough due cards to drill, with the scheduling
 * state spread across the states the app can be in: brand new, mid-learning,
 * comfortably graduated, and one card that has been forgotten twice. `due` is
 * in days from now, so negatives are waiting in the queue.
 */
const SEED = [
  {
    name: 'Spanish verbs',
    description: 'The irregular ones that keep catching me out.',
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
    name: 'HTTP status codes',
    description: 'The ones worth knowing without looking them up.',
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
    name: 'SQLite',
    description: 'Things this app itself relies on.',
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

/**
 * Replaces the contents of the development database. Destructive by design:
 * dev data is scratch, and a seed you can trust to be identical every time is
 * worth more than whatever was in there.
 */
async function seed() {
  const developmentFile = developmentTarget('seed');

  if (!fs.existsSync(developmentFile)) {
    throw new Error(
      `No database at ${path.relative(process.cwd(), developmentFile)}. ` +
        'Run `pnpm db:migrate` first.',
    );
  }

  const client = createClient({ url: `file:${developmentFile}` });
  const now = Math.floor(Date.now() / 1000);
  let deckCount = 0;
  let cardCount = 0;

  try {
    // reviews and cards go with their parents via ON DELETE CASCADE.
    await client.execute('DELETE FROM decks');
    await client.execute(
      "DELETE FROM sqlite_sequence WHERE name IN ('decks', 'cards', 'reviews')",
    );

    for (const deck of SEED) {
      const { lastInsertRowid: deckId } = await client.execute({
        sql: 'INSERT INTO decks (name, description, created_at) VALUES (?, ?, ?)',
        args: [deck.name, deck.description, now - 30 * DAY_SECONDS],
      });
      deckCount += 1;

      for (const card of deck.cards) {
        const reps = card.reps ?? 0;
        const interval = card.interval ?? 0;
        await client.execute({
          sql: `INSERT INTO cards
                  (deck_id, front, back, due_at, interval_raw, interval_days,
                   ease_factor, reps, lapses, last_reviewed_at, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            Number(deckId),
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
            now - 30 * DAY_SECONDS,
          ],
        });
        cardCount += 1;
      }
    }
  } finally {
    client.close();
  }

  const due = SEED.flatMap((deck) => deck.cards).filter(
    (card) => card.due <= 0,
  );
  console.log(
    `Seeded ${path.relative(process.cwd(), developmentFile)}: ` +
      `${deckCount} decks, ${cardCount} cards, ${due.length} due now.`,
  );
}

/** What is in the backup directory, newest first, with what each holds. */
async function list() {
  const found = snapshots(BACKUP_DIR);

  if (found.length === 0) {
    console.log(
      `No snapshots in ${short(BACKUP_DIR)} yet. Run \`pnpm db:backup\`.`,
    );
    return;
  }

  console.log(
    `${found.length} snapshot(s) in ${short(BACKUP_DIR)}, newest first:\n`,
  );
  for (const { name, file, at } of found) {
    let contents;
    try {
      const counts = await verify(file);
      contents = `${counts.decks} decks, ${counts.cards} cards, ${counts.reviews} reviews`;
    } catch (error) {
      contents = `UNREADABLE — ${error.message}`;
    }
    console.log(
      `  ${name.slice(PREFIX.length, -SUFFIX.length)}  ` +
        `${ago(at).padStart(8)}  ${size(file).padStart(8)}  ${contents}`,
    );
  }
  console.log('\nRestore one with `pnpm db:restore <timestamp>`, or `latest`.');
}

/**
 * Puts a snapshot back. Safe to run wrong: the file being replaced is itself
 * snapshotted first, so a restore is undoable by another restore. Stop the
 * production server before running it — a live server holds an open handle to
 * the file being swapped out.
 */
async function restore() {
  const wanted = process.argv[3];

  if (!wanted) {
    throw new Error(
      'Which snapshot? Pass a timestamp from `pnpm db:backups`, or `latest`.',
    );
  }

  const found = snapshots(BACKUP_DIR);
  const chosen =
    wanted === 'latest'
      ? found[0]
      : found.find(({ name }) => name.includes(wanted));

  if (!chosen) {
    throw new Error(
      `No snapshot matching "${wanted}". Run \`pnpm db:backups\` to see what there is.`,
    );
  }

  // Read the snapshot before trusting it with the real file's place.
  const incoming = await verify(chosen.file);

  const productionFile = localFile(databaseUrl('production'), 'production');
  if (fs.existsSync(productionFile)) {
    const previous = path.join(
      BACKUP_DIR,
      snapshotName(new Date(), 'before-restore'),
    );
    await snapshot(`file:${productionFile}`, previous);
    console.log(`Current production saved to ${short(previous)} first.`);
  }

  fs.copyFileSync(chosen.file, productionFile);
  for (const sidecar of ['-wal', '-shm']) {
    fs.rmSync(`${productionFile}${sidecar}`, { force: true });
  }

  console.log(
    `Restored ${chosen.name} → ${short(productionFile)}: ` +
      `${incoming.decks} decks, ${incoming.cards} cards, ${incoming.reviews} reviews.`,
  );
}

const commands = {
  backup,
  list,
  restore,
  'clone-prod': cloneProd,
  'reset-dev': resetDev,
  seed,
};
// Only dispatch when run as a script — `__tests__/db-retention.test.ts`
// imports this module for the retention policy.
if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const command = commands[process.argv[2]];

  if (!command) {
    console.error(
      `Usage: node scripts/db.mjs <${Object.keys(commands).join('|')}>`,
    );
    process.exit(1);
  }

  await command();
}
