import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import * as schema from './schema.js';

const createDatabaseClient = (url: string) => {
  const client = createClient({ url });
  return drizzle(client, { schema, logger: true });
};

type DatabaseClient = Awaited<ReturnType<typeof createDatabaseClient>>;

export { createDatabaseClient };
export type { DatabaseClient };
