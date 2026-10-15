import { loadEnvConfig } from '@next/env';
import { defineConfig } from 'drizzle-kit';

import { assertDrizzleTargetIsSafe } from './src/lib/db/config';

// drizzle-kit runs outside the Next.js runtime, so load .env* files ourselves.
// The second argument is `dev`: @next/env defaults it to *production*, so it
// has to be passed explicitly or every drizzle-kit command reads
// `.env.production` and aims at the real database.
loadEnvConfig(process.cwd(), process.env.NODE_ENV !== 'production');

const url = process.env.DATABASE_URL;

if (!url) {
  throw new Error('DATABASE_URL is not set');
}

// `process.argv[2]` is the drizzle-kit subcommand — `generate`, `migrate`,
// `push`, `studio` — since the config is evaluated inside the CLI's process.
assertDrizzleTargetIsSafe(url, process.env.NODE_ENV, process.argv[2]);

export default defineConfig({
  schema: ['./src/lib/db/schema.ts', './src/lib/auth/schema.ts'],
  out: './drizzle',
  dialect: 'turso',
  dbCredentials: {
    url,
    authToken: process.env.TURSO_AUTH_TOKEN,
  },
});
