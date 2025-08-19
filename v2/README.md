# KG v2 - Knowledge Graph Tool

A TypeScript-based knowledge graph tool that integrates with Ollama for intelligent search and question answering on your markdown notes.

## Features

- **Intelligent Search**: Search through markdown files using natural language queries
- **AI-Powered Q&A**: Ask questions about your knowledge base and get contextual answers
- **Tool Calling**: Demonstrates Ollama tool calling capabilities with example functions
- **Frontmatter Support**: Parse YAML frontmatter from markdown files for metadata

## Installation

```bash
pnpm install
```

## Usage

### Search Knowledge Base

Search for relevant files in your `nodes/` directory:

```bash
npm run search "What is a Dyson sphere?"
```

### Ask Questions

Query your knowledge base in `.kg/nodes/` directory:

```bash
npm run ask "What is quantum computing?"
```

### Tool Calling Demo

Run the main demo that showcases Ollama tool calling:

```bash
npm run dev
```

### Build

Compile TypeScript to JavaScript:

```bash
npm run build
```

### Test

Run the test suite:

```bash
npm test
```

## Project Structure

```
v2/
├── src/
│   ├── ask.ts           # Question answering system
│   ├── search.ts        # Knowledge base search
│   ├── main.ts          # Tool calling demo
│   ├── frontmatter.ts   # YAML frontmatter parser
│   └── frontmatter.test.ts
├── package.json
├── tsconfig.json
└── README.md
```

## Dependencies

- **ollama**: Interface with Ollama models for AI capabilities
- **yaml**: Parse YAML frontmatter in markdown files
- **tsx**: TypeScript execution
- **vitest**: Testing framework

## Model Configuration

The project is configured to use the `gpt-oss:20b` model with Ollama. Make sure you have this model installed:

```bash
ollama pull gpt-oss:20b
```

## Directory Structure

- `nodes/` - Directory for general markdown files (used by search)
- `.kg/nodes/` - Knowledge graph nodes directory (used by ask)

Your markdown files should include YAML frontmatter for proper categorization:

```markdown
---
title: "Your Note Title"
type: "note"
id: "unique-id"
---

Your content here...
```

## License

MIT