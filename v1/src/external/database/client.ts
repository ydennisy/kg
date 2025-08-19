import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import * as schema from './schemas.js';

// TODO: pass in from config
const createDatabaseClient = () => {
  const client = createClient({ url: 'file:local.db' });
  return drizzle(client, { schema });
};

type DatabaseClient = ReturnType<typeof createDatabaseClient>;

export { createDatabaseClient };
export type { DatabaseClient };
