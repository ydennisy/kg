import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { migrate } from 'drizzle-orm/libsql/migrator';
import {
  createDatabaseClient,
  type DatabaseClient,
} from '../src/external/database/client.js';

type TestDatabase = DatabaseClient & { cleanup: () => Promise<void> };

async function createTestDatabase(): Promise<TestDatabase> {
  const dbFile = path.join(os.tmpdir(), `${randomUUID()}.db`);
  const db = createDatabaseClient(`file:${dbFile}`);
  await migrate(db, { migrationsFolder: './drizzle' });

  const cleanup = async () => {
    try {
      await fs.unlink(dbFile);
    } catch {}
  };

  return Object.assign(db, { cleanup });
}

export { createTestDatabase };
export type { TestDatabase };
