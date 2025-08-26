import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';
import type { AppConfig } from '../../application/application-factory.js';

class ConfigLoader {
  private configPath = path.join(os.homedir(), '.kg', 'config.json');

  async load(): Promise<AppConfig | undefined> {
    try {
      const config = await fs.readFile(this.configPath, 'utf-8');
      return JSON.parse(config);
    } catch (err) {
      return undefined;
    }
  }

  async save(config: AppConfig): Promise<void> {
    await fs.mkdir(path.dirname(this.configPath), { recursive: true });
    await fs.writeFile(this.configPath, JSON.stringify(config, null, 2));
  }
}

export { ConfigLoader };
