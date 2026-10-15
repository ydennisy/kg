/**
 * Production is the hosted Turso database; development is a local SQLite file.
 * So "is this production?" is "is this remote?" — no list of paths to keep in
 * sync, and a fresh checkout cannot reach production without its credentials.
 */
export function isRemoteDatabase(url: string): boolean {
  return !url.startsWith('file:');
}

/**
 * A dev server writes freely, so it must never be pointed at production. The
 * easy way for that to happen is Turso credentials left in `.env.local`, which
 * Next loads in *both* environments.
 *
 * Called for its throw at the top of `src/lib/db/index.ts`.
 */
export function assertDatabaseMatchesEnvironment(
  url: string,
  nodeEnv: string | undefined,
): void {
  if (nodeEnv === 'production' || !isRemoteDatabase(url)) return;

  throw new Error(
    `DATABASE_URL points at a remote database but NODE_ENV is "${nodeEnv}". ` +
      'Refusing to start. Development belongs in a local file — keep the ' +
      'Turso credentials in .env.production.local, never .env.local.',
  );
}

/**
 * Every drizzle-kit command comes through `drizzle.config.ts`, which makes it
 * the one place worth guarding. Two things are refused against production:
 *
 * - `push`, ever. It diffs the schema straight onto the database and will drop
 *   a column — and its data — with no migration to review.
 * - anything that did not explicitly ask for production by setting NODE_ENV,
 *   which is what the `:prod` scripts do.
 */
export function assertDrizzleTargetIsSafe(
  url: string,
  nodeEnv: string | undefined,
  command: string | undefined,
): void {
  if (!isRemoteDatabase(url)) return;

  if (command === 'push') {
    throw new Error(
      'Refusing to `drizzle-kit push` against the production database. ' +
        'Generate a named migration instead: ' +
        '`pnpm db:generate --name <what_changed>` then `pnpm db:migrate:prod`.',
    );
  }

  if (nodeEnv !== 'production') {
    throw new Error(
      'DATABASE_URL points at the production database but NODE_ENV is not ' +
        '"production". Refusing to run. Use the `:prod` scripts to work ' +
        'against real data.',
    );
  }
}
