# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this
repository.

## Project Overview

This is a TypeScript-based knowledge graph (KG) CLI application for personal
knowledge management. It follows Clean Architecture principles with strict
dependency inversion - the core domain never depends on external frameworks.

### Core Node Types

- **note**: Content-based knowledge with title and content
- **link**: URL references with automatic title fallback
- **tag**: Named categories for organizing nodes
- **flashcard**: Study cards with front/back content

## Development Commands

### Building and Running

```bash
# Build TypeScript to JavaScript
pnpm run build

# Run CLI directly with tsx (development)
pnpm run cli

# Run built version
node dist/main.js

# Run tests
pnpm run test

# Run tests in watch mode
pnpm run test --watch
```

### Database Management

```bash
# Reset local database (removes local.db and recreates schema)
pnpm run db:reset

# Generate new migrations after schema changes
pnpm run db:generate

# Apply pending migrations
pnpm run db:migrate
```

### Site Publishing

```bash
# Build and publish public nodes to static HTML
pnpm run site:build

# Deploy to Vercel (requires environment setup)
pnpm run site:deploy
```

### Testing Single Files

```bash
# Run specific test file
pnpm run test src/domain/node-factory.test.ts

# Run tests matching pattern
pnpm run test --grep "creates a note"
```

## Architecture

### Clean Architecture Layers

The project follows strict Clean Architecture with 4 distinct layers:

1. **Domain** (`src/domain/`): Core business entities and factories

   - `node.ts`, `edge.ts` - Core entities
   - `node-factory.ts`, `edge-factory.ts` - Factory patterns
   - `ports/` - Interfaces for external dependencies

2. **Application** (`src/application/`): Use cases and business rules

   - `use-cases/` - Application business logic (CreateNodeUseCase,
     PublishSiteUseCase)
   - `ports/` - Repository and service interfaces

3. **Adapters** (`src/adapters/`): Data transformation layer

   - `node-mapper.ts`, `edge-mapper.ts` - Convert between domain and persistence
     models

4. **External** (`src/external/`): Framework and infrastructure concerns
   - `cli/` - Commander.js CLI interface
   - `database/` - Drizzle ORM and SQLite setup
   - `repositories/` - Concrete repository implementations
   - `validation/` - AJV schema validation
   - `publishers/` - HTML generation for static sites

### Key Dependency Rule

**Never import CLI/database/web frameworks in domain or application layers.**
All external dependencies flow inward through interfaces.

### Data Flow

1. CLI collects user input via Inquirer prompts
2. Commands invoke Use Cases with request objects
3. Use Cases operate on Domain entities via Repository ports
4. Adapters convert between domain models and persistence
5. External layer handles database operations via Drizzle ORM

## Database Schema

### Core Tables

- **nodes**: Stores all node types with JSON data field and FTS support
- **edges**: Relationships between nodes with typed connections
- **nodes_fts**: Full-text search virtual table with automatic sync triggers

### Node Types in Schema

```sql
type: text('type', { enum: ['note', 'link', 'tag', 'flashcard'] })
```

## Testing Strategy

### Test Organization

- Unit tests alongside source files (`.test.ts`)
- E2E tests in `src/e2e/`
- Mocked repositories for use case testing
- Vitest as test runner with Node.js and Vitest globals

### Test Patterns

```typescript
// Mock repositories for isolated use case testing
const mockRepository: NodeRepository = {
  save: async (node: Node) => Promise.resolve(),
  // ... other methods
};
```

## Environment Setup

### Required Environment Variables

- `DATABASE_URL`: SQLite database connection (defaults to `file:local.db`)

### Development Database

- Uses local SQLite file (`local.db`) by default
- Full-text search enabled via FTS5 virtual tables
- Automatic triggers keep FTS index synchronized

## CLI Usage Patterns

### Interactive Node Creation

1. Select node type from menu
2. Collect type-specific data via prompts
3. Set public/private visibility
4. Optionally link to existing nodes via search

### Node Linking

- Autocomplete search across all existing nodes
- Filtered results exclude self and already-linked nodes
- Creates bidirectional edges in database

### Site Publishing

- Generates static HTML for all public nodes
- Output to `./public` directory
- Ready for static hosting deployment

## Key Implementation Details

### Schema Registration

All node types require JSON schema registration in `main.ts` before the
NodeFactory can validate and create nodes.

### Full-Text Search

SQLite FTS5 enables searching across node titles and JSON data content with
automatic Porter stemming and Unicode support.

### Edge Types

Supports typed relationships: `references`, `contains`, `tagged_with`,
`similar_to`, `responds_to`
