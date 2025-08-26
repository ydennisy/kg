import os from 'node:os';
import path from 'node:path';
import { Command } from 'commander';
import { migrate } from 'drizzle-orm/libsql/migrator';
import { createDatabaseClient } from '../../database/client.js';
import type { ConfigLoader } from '../../config/config-loader.js';

class InitCommand {
  constructor(private configLoader: ConfigLoader) {}

  register(program: Command): void {
    program
      .command('init')
      .description('Initialise the KG CLI')
      .action(async () => {
        await this.execute();
      });
  }

  private async execute() {
    const databaseUrl = path.join(os.homedir(), '.kg', 'kg.db');

    // TODO: check if config exists and exit, provide a force flag
    await this.configLoader.save({ databaseUrl });

    const db = createDatabaseClient(`file:${databaseUrl}`);
    await migrate(db, { migrationsFolder: './drizzle' });

    console.log(`✅ KG CLI has been sucessfully initialised!`);
  }
}

export { InitCommand };
