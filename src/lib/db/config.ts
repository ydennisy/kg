import path from 'node:path';

/**
 * The database that must survive everything: real decks, real cards, real
 * review history. Kept as a constant so the runtime (`src/lib/db/index.ts`),
 * drizzle-kit (`drizzle.config.ts`) and the maintenance scripts all agree on
 * which file is precious.
 */
export const PRODUCTION_DB_PATH = 'data/prod.db';

/**
 * The local file a `file:` libSQL URL points at, or null for a remote one.
 *
 * `path.resolve` on its own rather than `path.resolve(process.cwd(), ...)`:
 * the two are equivalent, but Turbopack reads the explicit `process.cwd()` as
 * a filesystem access rooted at the project and traces every file in it into
 * the server bundle.
 */
export function databaseFile(url: string): string | null {
  if (!url.startsWith('file:')) return null;
  const [file] = url.slice('file:'.length).split('?');
  return path.resolve(file);
}

/** True when this URL resolves to the production database file. */
export function isProductionDatabase(url: string): boolean {
  const file = databaseFile(url);
  return file !== null && file === path.resolve(PRODUCTION_DB_PATH);
}

/**
 * The last line of defence for the real cards: a dev server writes freely, so
 * it must never be pointed at the production file. This catches the usual way
 * that happens — a DATABASE_URL in `.env.local`, which Next loads in *both*
 * environments — before the first write rather than after it.
 *
 * Called for its throw at the top of `src/lib/db/index.ts`.
 */
export function assertDatabaseMatchesEnvironment(
  url: string,
  nodeEnv: string | undefined,
): void {
  if (nodeEnv === 'production' || !isProductionDatabase(url)) return;

  throw new Error(
    `DATABASE_URL points at the production database (${PRODUCTION_DB_PATH}) ` +
      `but NODE_ENV is "${nodeEnv}". Refusing to start. Development belongs ` +
      `in data/dev.db — run \`pnpm db:clone-prod\` if you want a copy of the ` +
      `real data to work against.`,
  );
}

/**
 * Every drizzle-kit command comes through `drizzle.config.ts`, which makes it
 * the one place worth guarding. Two things are refused:
 *
 * - `push`, ever, against production. It diffs the schema straight onto the
 *   database and will drop a column — and its data — with no migration to
 *   review. It is a development convenience only.
 * - anything against production that did not explicitly ask for production by
 *   setting NODE_ENV, which is what the `:prod` scripts do (after a backup).
 */
export function assertDrizzleTargetIsSafe(
  url: string,
  nodeEnv: string | undefined,
  command: string | undefined,
): void {
  if (!isProductionDatabase(url)) return;

  if (command === 'push') {
    throw new Error(
      'Refusing to `drizzle-kit push` against the production database. ' +
        'Generate a named migration instead: ' +
        '`pnpm db:generate --name <what_changed>` then `pnpm db:migrate:prod`.',
    );
  }

  if (nodeEnv !== 'production') {
    throw new Error(
      'DATABASE_URL resolves to the production database but NODE_ENV is not ' +
        '"production". Refusing to run. Use the `:prod` scripts to work ' +
        'against real data — they take a backup first.',
    );
  }
}
