import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';

import { assertDatabaseMatchesEnvironment } from './config';
import * as schema from './schema';

const url = process.env.DATABASE_URL;

if (!url) {
  throw new Error('DATABASE_URL is not set');
}

assertDatabaseMatchesEnvironment(url, process.env.NODE_ENV);

// Reuse the client across HMR reloads in dev so we don't leak connections.
const globalForDb = globalThis as unknown as {
  libsqlClient?: ReturnType<typeof createClient>;
};

const client =
  globalForDb.libsqlClient ??
  createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN });

if (process.env.NODE_ENV !== 'production') {
  globalForDb.libsqlClient = client;
}

export const db = drizzle(client, { schema });
export * from './schema';
