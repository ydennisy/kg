# Clean Architecture Approach

Perfect question! Uncle Bob would create Use Cases (Interactors) to isolate your
domain from UI concerns. Here's the Clean Architecture approach.

## Layer Structure

```text
src/
├── domain/                # Core business logic
│   ├── node.ts
│   └── validator.ts
├── usecases/              # Application business rules
│   ├── create-node.ts
│   ├── list-nodes.ts
│   └── export-nodes.ts
├── infrastructure/        # External concerns
│   ├── cli/
│   │   ├── commander-cli.ts
│   │   └── inquirer-prompts.ts
│   ├── persistence/
│   │   └── file-repository.ts
│   └── validation/
│       └── ajv-validator.ts
└── main.ts                # Composition root
```

## Use Case Pattern

```typescript
// usecases/create-node.ts - Pure business logic

interface CreateNodeRequest {
  type: NodeType;
  data: Record<string, any>;
  tags?: string[];
}

interface CreateNodeResponse {
  success: boolean;
  nodeId?: string;
  errors?: string[];
}

interface NodeRepository {
  save(node: Node): Promise<void>;
}

class CreateNodeUseCase {
  constructor(
    private factory: NodeFactory,
    private repository: NodeRepository
  ) {}

  async execute(request: CreateNodeRequest): Promise<CreateNodeResponse> {
    try {
      const node = this.factory.createNode(
        request.type,
        request.data,
        request.tags
      );
      await this.repository.save(node);
      return { success: true, nodeId: node.id };
    } catch (error: any) {
      return { success: false, errors: [error.message] };
    }
  }
}
```

## CLI as Infrastructure

```typescript
// infrastructure/cli/commander-cli.ts - UI Layer

class CommanderCli {
  constructor(
    private createNodeUseCase: CreateNodeUseCase,
    private listNodesUseCase: ListNodesUseCase
  ) {}

  setupCommands() {
    program.command('create <type>').action(async (type) => {
      const data = await this.promptForData(type); // Inquirer
      const response = await this.createNodeUseCase.execute({
        type,
        data,
        tags: [],
      });

      if (response.success) {
        console.log(`Created node: ${response.nodeId}`);
      } else {
        console.error('Failed:', response.errors);
      }
    });
  }
}
```

## Future Web API

```typescript
// infrastructure/web/express-api.ts - Different UI, same use cases

app.post('/nodes', async (req, res) => {
  const response = await createNodeUseCase.execute(req.body);

  if (response.success) {
    res.json({ id: response.nodeId });
  } else {
    res.status(400).json({ errors: response.errors });
  }
});
```

## Benefits

1. Domain stays pure — No CLI/web imports in business logic.
2. Use cases are testable — Mock repositories, no UI dependencies.
3. Multiple UIs — CLI, web, mobile can all use same use cases.
4. Easy testing — Test use cases independently of UI.
5. Dependency direction — UI depends on domain, never reverse.

## Key Rule

> Never import Commander/Inquirer/Express in your domain or use case layers.
> Only infrastructure imports external libraries.  
> Your domain becomes a plugin that different UIs can use, not something tied to
> any specific interface.

---

> ok, I am not sold on the infrastructure naming, so you are saying everything
> goes into infra? DB, UI, express, react app, validation, etc etc??

You're absolutely right to question that! "Infrastructure" is overloaded and
confusing. Uncle Bob actually uses more specific naming. Let me show you the
proper Clean Architecture layers.

## Clean Architecture Layers (Uncle Bob's actual naming)

```text
src/
├── entities/                  # Enterprise business rules
│   ├── node.ts
│   └── validation-result.ts
├── use-cases/                 # Application business rules
│   ├── create-node.ts
│   ├── list-nodes.ts
│   └── ports/                 # Interfaces/contracts
│       ├── node-repository.ts
│       └── validator.ts
├── interface-adapters/        # Convert data for use cases <-> external
│   ├── controllers/
│   │   ├── cli-controller.ts
│   │   └── web-controller.ts
│   ├── presenters/
│   │   └── json-presenter.ts
│   └── gateways/              # Repository implementations
│       └── file-node-repository.ts
├── frameworks-drivers/        # External tools/frameworks
│   ├── web/
│   │   └── express-app.ts
│   ├── cli/
│   │   ├── commander-setup.ts
│   │   └── inquirer-prompts.ts
│   ├── database/
│   │   └── sqlite-driver.ts
│   └── validation/
│       └── ajv-validator.ts
└── main.ts                    # Composition root
```

### The Key Insight

Not everything is "infrastructure". There are 4 distinct layers:

1. Entities = Core business objects
2. Use Cases = Application logic + interfaces (ports)
3. Interface Adapters = Convert between use cases and external world
4. Frameworks & Drivers = External tools (Commander, Express, AJV, SQLite)

### Dependency Direction

Frameworks → Interface Adapters → Use Cases → Entities

### Alternative naming (also common)

```text
src/
├── core/        # Entities + Use Cases
├── adapters/    # Interface Adapters
├── external/    # Frameworks & Drivers
└── main.ts
```

### Or Hexagonal Architecture naming

```text
src/
├── domain/         # Entities
├── application/    # Use Cases + Ports
├── adapters/       # Interface Adapters
├── drivers/        # Frameworks & Drivers
└── main.ts
```

The key is dependency inversion: Your core business logic doesn't know about
CLI, web, or databases. They all depend on your core, not the other way around.

Which naming resonates better with you?
