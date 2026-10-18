import { createClient } from '@libsql/client';
import { spawnSync } from 'node:child_process';
import {
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
  existsSync,
} from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, beforeEach, expect, test } from 'vitest';

const root = process.cwd();
const tsx = createRequire(import.meta.url).resolve('tsx');
let directory: string;
beforeEach(() => {
  directory = mkdtempSync(join(tmpdir(), 'kg-scripts-'));
});
afterEach(() => {
  rmSync(directory, { recursive: true, force: true });
});

function run(script: string, ...args: string[]) {
  const env: NodeJS.ProcessEnv = { ...process.env, NODE_ENV: 'development' };
  // Each command loads only this test's .env.development, never real credentials.
  for (const name of [
    'DATABASE_URL',
    'TURSO_AUTH_TOKEN',
    '__NEXT_PROCESSED_ENV',
  ]) {
    delete env[name];
  }
  return spawnSync(
    process.execPath,
    ['--import', tsx, resolve(root, 'scripts', script), ...args],
    {
      cwd: directory,
      env,
      encoding: 'utf8',
      timeout: 10000,
    },
  );
}

async function baseline(file: string) {
  const client = createClient({ url: `file:${file}` });
  await client.executeMultiple(
    readFileSync(join(root, 'drizzle/0000_initial_schema.sql'), 'utf8'),
  );
  return client;
}

test('tsx seed, owner assignment and reset work on a scratch database', async () => {
  const file = join(directory, 'dev.db');
  writeFileSync(
    join(directory, '.env.development'),
    `DATABASE_URL=file:${file}\n`,
  );
  const client = await baseline(file);
  try {
    const seeded = run('db.ts', 'seed');
    expect(seeded.status, seeded.stderr).toBe(0);
    expect(
      (await client.execute('SELECT count(*) AS n FROM cards')).rows[0].n,
    ).toBe(21);
    await client.executeMultiple(
      "INSERT INTO user (id, name, email) VALUES ('owner', 'Owner', 'owner@example.com'); INSERT INTO account (id, account_id, provider_id, user_id, updated_at) VALUES ('account', 'github-id', 'github', 'owner', 0);",
    );
    const assigned = run('ownership.ts', 'assign', 'owner');
    expect(assigned.status, assigned.stderr).toBe(0);
    expect(
      (
        await client.execute(
          "SELECT count(*) AS n FROM cards WHERE user_id = 'owner'",
        )
      ).rows[0].n,
    ).toBe(21);
  } finally {
    client.close();
  }
  const reset = run('db.ts', 'reset-dev');
  expect(reset.status, reset.stderr).toBe(0);
  expect(existsSync(file)).toBe(false);
});

test('tsx commands reject remote databases in development before connecting', () => {
  writeFileSync(
    join(directory, '.env.development'),
    'DATABASE_URL=libsql://must-not-connect.invalid\n',
  );
  for (const args of [
    ['db.ts', 'seed'],
    ['db.ts', 'reset-dev'],
    ['ownership.ts', 'assign', 'owner'],
  ]) {
    const result = run(args[0], ...args.slice(1));
    expect(result.status).toBe(1);
    expect(result.stderr).toMatch(/Refusing to|Remote databases require/);
  }
});
