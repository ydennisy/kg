import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  out: './drizzle',
  schema: './src/external/database/schema.ts',
  dialect: 'sqlite',
  dbCredentials: {
    // @ts-expect-error
    url: process.env.DATABASE_URL!,
  },
});
