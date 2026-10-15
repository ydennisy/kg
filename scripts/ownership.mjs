#!/usr/bin/env node
import { createClient } from '@libsql/client';
import nextEnv from '@next/env';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { assignOwner, importLegacy } from './lib/ownership.mjs';

const [command, argument] = process.argv.slice(2);
if (!['import', 'assign'].includes(command) || !argument) {
  throw new Error(
    'Usage: node scripts/ownership.mjs import <legacy-file> | assign <user-id>',
  );
}
nextEnv.loadEnvConfig(process.cwd(), process.env.NODE_ENV !== 'production');
const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is not set');
if (!url.startsWith('file:') && process.env.NODE_ENV !== 'production') {
  throw new Error('Remote databases require the explicit :prod command.');
}
const target = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN });
try {
  if (command === 'assign') {
    console.log(await assignOwner(target, argument));
  } else {
    const file = resolve(argument);
    if (!existsSync(file)) throw new Error('Source database does not exist');
    if (url.startsWith('file:') && resolve(url.slice(5)) === file) {
      throw new Error('Source and destination must be different databases');
    }
    const source = createClient({ url: `file:${file}` });
    try {
      console.log(await importLegacy(source, target));
    } finally {
      source.close();
    }
  }
} finally {
  target.close();
}
