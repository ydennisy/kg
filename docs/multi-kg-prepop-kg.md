Looking at your codebase and requirements, here's a comprehensive plan for
implementing multi-database support with initialization and pre-populated
knowledge graphs:

## Architecture Overview

### 1. Configuration Management

Create a configuration system that tracks:

- Available knowledge graphs (databases)
- Currently active database
- Database locations
- User preferences

```typescript
// src/domain/config.ts
interface KnowledgeGraphConfig {
  id: string;
  name: string;
  path: string;
  description?: string;
  createdAt: Date;
  lastAccessedAt: Date;
  isDefault: boolean;
}

interface AppConfig {
  version: string;
  activeGraphId: string;
  graphs: KnowledgeGraphConfig[];
  dataDir: string; // ~/.kg by default
}
```

Store config in `~/.kg/config.json`:

```json
{
  "version": "1.0.0",
  "activeGraphId": "personal",
  "dataDir": "/home/user/.kg",
  "graphs": [
    {
      "id": "personal",
      "name": "Personal",
      "path": "/home/user/.kg/databases/personal.db",
      "description": "My personal knowledge graph",
      "createdAt": "2024-01-01T00:00:00Z",
      "lastAccessedAt": "2024-01-15T00:00:00Z",
      "isDefault": true
    },
    {
      "id": "engineering",
      "name": "Engineering Template",
      "path": "/home/user/.kg/databases/engineering.db",
      "description": "Pre-filled engineering knowledge",
      "createdAt": "2024-01-01T00:00:00Z",
      "lastAccessedAt": "2024-01-10T00:00:00Z",
      "isDefault": false
    }
  ]
}
```

### 2. Database Resolution Strategy

```typescript
// src/application/ports/config-repository.ts
interface ConfigRepository {
  loadConfig(): Promise<AppConfig | null>;
  saveConfig(config: AppConfig): Promise<void>;
  getActiveDatabase(): Promise<string>;
  setActiveDatabase(graphId: string): Promise<void>;
  addGraph(graph: KnowledgeGraphConfig): Promise<void>;
  removeGraph(graphId: string): Promise<void>;
}

// src/external/config/file-config-repository.ts
class FileConfigRepository implements ConfigRepository {
  private configPath: string;

  constructor(homeDir: string = os.homedir()) {
    this.configPath = path.join(homeDir, '.kg', 'config.json');
  }

  async loadConfig(): Promise<AppConfig | null> {
    try {
      const content = await fs.readFile(this.configPath, 'utf-8');
      return JSON.parse(content);
    } catch {
      return null;
    }
  }

  // ... other methods
}
```

### 3. Database Resolution Flow

```typescript
// src/external/database/database-resolver.ts
class DatabaseResolver {
  constructor(
    private configRepository: ConfigRepository,
    private isDevelopment: boolean = process.env.NODE_ENV === 'development'
  ) {}

  async resolveDatabasePath(): Promise<string> {
    // 1. Check environment variable (highest priority)
    if (process.env.DATABASE_URL) {
      return process.env.DATABASE_URL;
    }

    // 2. Development mode - use local.db in project root
    if (this.isDevelopment && (await this.localDbExists())) {
      return 'file:local.db';
    }

    // 3. Use config system
    const config = await this.configRepository.loadConfig();
    if (!config) {
      throw new Error('No configuration found. Please run: kg init');
    }

    const activeGraph = config.graphs.find(
      (g) => g.id === config.activeGraphId
    );
    if (!activeGraph) {
      throw new Error(`Active graph ${config.activeGraphId} not found`);
    }

    return `file:${activeGraph.path}`;
  }

  private async localDbExists(): Promise<boolean> {
    try {
      await fs.access('local.db');
      return true;
    } catch {
      return false;
    }
  }
}
```

### 4. Init Command Implementation

```typescript
// src/external/cli/commands/init.ts
class InitCommand {
  private templates = {
    engineering: 'https://kg-templates.example.com/engineering.db',
    physics: 'https://kg-templates.example.com/physics.db',
    mathematics: 'https://kg-templates.example.com/mathematics.db',
  };

  async execute(): Promise<void> {
    // 1. Check if already initialized
    const configExists = await this.checkExistingConfig();
    if (configExists) {
      const overwrite = await confirm({
        message: 'Configuration already exists. Reinitialize?',
        default: false,
      });
      if (!overwrite) return;
    }

    // 2. Ask for data directory
    const dataDir = await input({
      message: 'Where should knowledge graphs be stored?',
      default: path.join(os.homedir(), '.kg'),
    });

    // 3. Create directory structure
    await this.createDirectoryStructure(dataDir);

    // 4. Ask about templates
    const useTemplate = await confirm({
      message: 'Would you like to start with a pre-filled knowledge graph?',
      default: true,
    });

    const graphs: KnowledgeGraphConfig[] = [];

    if (useTemplate) {
      const template = await select({
        message: 'Choose a template to get started:',
        choices: [
          {
            name: 'Engineering (CS, DevOps, Architecture)',
            value: 'engineering',
          },
          {
            name: 'Physics (Classical, Quantum, Relativity)',
            value: 'physics',
          },
          {
            name: 'Mathematics (Calculus, Linear Algebra, Stats)',
            value: 'mathematics',
          },
          { name: 'Start blank', value: 'none' },
        ],
      });

      if (template !== 'none') {
        await this.downloadTemplate(template, dataDir);
        graphs.push({
          id: template,
          name: `${this.capitalize(template)} Template`,
          path: path.join(dataDir, 'databases', `${template}.db`),
          description: `Pre-filled ${template} knowledge`,
          createdAt: new Date(),
          lastAccessedAt: new Date(),
          isDefault: false,
        });
      }
    }

    // 5. Create personal database
    const personalDb = path.join(dataDir, 'databases', 'personal.db');
    await this.createEmptyDatabase(personalDb);
    graphs.push({
      id: 'personal',
      name: 'Personal',
      path: personalDb,
      description: 'Your personal knowledge graph',
      createdAt: new Date(),
      lastAccessedAt: new Date(),
      isDefault: true,
    });

    // 6. Save configuration
    const config: AppConfig = {
      version: packageJSON.version,
      activeGraphId: 'personal',
      dataDir,
      graphs,
    };

    await this.configRepository.saveConfig(config);

    console.log(`
✅ Knowledge Graph initialized successfully!

📁 Data directory: ${dataDir}
📚 Available graphs: ${graphs.map((g) => g.name).join(', ')}
🎯 Active graph: Personal

To switch between graphs, use: kg switch
To create a new graph, use: kg new
To import an existing database, use: kg import <path>
    `);
  }

  private async downloadTemplate(
    template: string,
    dataDir: string
  ): Promise<void> {
    const spinner = ora(`Downloading ${template} template...`).start();

    try {
      const response = await fetch(this.templates[template]);
      const buffer = await response.arrayBuffer();
      const dbPath = path.join(dataDir, 'databases', `${template}.db`);

      await fs.writeFile(dbPath, Buffer.from(buffer));
      spinner.succeed(`Downloaded ${template} template`);
    } catch (error) {
      spinner.fail(`Failed to download ${template} template`);
      throw error;
    }
  }

  private async createEmptyDatabase(dbPath: string): Promise<void> {
    const db = createDatabaseClient(`file:${dbPath}`);
    await migrate(db, { migrationsFolder: './drizzle' });
  }
}
```

### 5. Switch Command

```typescript
// src/external/cli/commands/switch.ts
class SwitchCommand {
  async execute(graphId?: string): Promise<void> {
    const config = await this.configRepository.loadConfig();
    if (!config) {
      console.error('Not initialized. Run: kg init');
      return;
    }

    if (!graphId) {
      // Interactive selection
      graphId = await select({
        message: 'Select knowledge graph:',
        choices: config.graphs.map((g) => ({
          name: `${g.name} ${g.id === config.activeGraphId ? '(active)' : ''}`,
          value: g.id,
          description: g.description,
        })),
      });
    }

    const graph = config.graphs.find((g) => g.id === graphId);
    if (!graph) {
      console.error(`Graph '${graphId}' not found`);
      return;
    }

    config.activeGraphId = graphId;
    graph.lastAccessedAt = new Date();
    await this.configRepository.saveConfig(config);

    console.log(`✅ Switched to '${graph.name}'`);
  }
}
```

### 6. Additional Commands

```typescript
// kg list - show all graphs
// kg new <name> - create new database
// kg import <path> - import existing database
// kg export <graphId> - export database for sharing
// kg delete <graphId> - remove a knowledge graph
```

### 7. Modified Main.ts

```typescript
// src/main.ts
class Application {
  private cli: CLI;

  async initialize(): Promise<void> {
    const configRepository = new FileConfigRepository();
    const resolver = new DatabaseResolver(
      configRepository,
      process.env.NODE_ENV === 'development'
    );

    let dbUrl: string;
    try {
      dbUrl = await resolver.resolveDatabasePath();
    } catch (error) {
      if (error.message.includes('Please run: kg init')) {
        console.error(`
⚠️  Knowledge Graph not initialized

Please run: kg init

This will set up your knowledge graph storage and optionally 
download a pre-filled template to get you started.
        `);
        process.exit(1);
      }
      throw error;
    }

    const db = createDatabaseClient(dbUrl);

    // Ensure migrations are up to date
    await migrate(db, { migrationsFolder: './drizzle' });

    // ... rest of initialization
  }

  async run(): Promise<void> {
    // Special handling for init command - doesn't need DB
    if (process.argv[2] === 'init') {
      const initCommand = new InitCommand(/* deps */);
      await initCommand.execute();
      return;
    }

    await this.initialize();
    this.cli.run(process.argv);
  }
}
```

## Implementation Order

1. **Phase 1: Core Infrastructure**
   - Config domain model and repository interface
   - File-based config repository implementation
   - Database resolver

2. **Phase 2: Init Command**
   - Basic init without templates
   - Directory structure creation
   - Empty database creation with migrations

3. **Phase 3: Multiple Databases**
   - Switch command
   - List command
   - New command

4. **Phase 4: Templates**
   - Create template databases with sample data
   - Host them (GitHub releases, S3, etc.)
   - Download functionality in init command

5. **Phase 5: Import/Export**
   - Export command for sharing
   - Import command for loading external databases
   - Validation of imported databases

## Key Considerations

1. **Backward Compatibility**: Development mode continues using `local.db`
   without configuration
2. **Migration Safety**: Always run migrations when switching databases
3. **Template Hosting**: Could use GitHub releases for free hosting of template
   databases
4. **Error Handling**: Clear messages when not initialized
5. **Data Directory**: Respect XDG base directory spec on Linux
   (`$XDG_DATA_HOME/kg`)
6. **Security**: Validate downloaded templates, check checksums
7. **Performance**: Lazy load config only when needed
8. **Testing**: Mock config repository for tests

This architecture keeps your Clean Architecture intact while adding
configuration as an external concern that flows inward through ports. The init
step provides a smooth onboarding experience while supporting power users who
want multiple knowledge graphs.
