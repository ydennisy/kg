import { createClient } from '@libsql/client';
import { loadEnvConfig } from '@next/env';
import { assignOwner } from './lib/ownership';

async function main() {
  const [command, userId] = process.argv.slice(2);
  if (command !== 'assign' || !userId) {
    throw new Error('Usage: tsx scripts/ownership.ts assign <user-id>');
  }
  loadEnvConfig(process.cwd(), true);
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set');
  if (!url.startsWith('file:')) {
    throw new Error(
      'Refusing to assign ownership on a remote database. This command is for local development only.',
    );
  }
  const client = createClient({ url });
  try {
    console.log(await assignOwner(client, userId));
  } finally {
    client.close();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
