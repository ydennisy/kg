# Knowledge Graph (KG) - Research & Ideas

## Project Vision & Goals

### Core Vision

KG is designed for personal knowledge management and shared knowledge of the
crowds. The architecture follows a progression: Local app → Networked →
Protocol.

### Development Philosophy

- Start with CLI app for MVP - easier and more defined approach
- Interface focused on saving articles initially
- Later expand to questioning/searching your own knowledge graph
- Consider git-like append-only data structure for knowledge accumulation

## CLI Tools Research & Inspiration

### Reference Collections

- [Awesome CLI Apps - Note Taking](https://github.com/agarrharr/awesome-cli-apps#note-taking-and-lists) -
  Primary research source for CLI app patterns

### CLI Applications to Study

- [Taskell](https://taskell.app/) - Kanban board CLI
- [Taskwarrior](https://taskwarrior.org/) - Task management
- [Idea](https://github.com/IonicaBizau/idea) - Lightweight idea management
- [Eureka](https://github.com/simeg/eureka) - Store and organize ideas
- [TD-CLI](https://github.com/darrikonn/td-cli) - Todo manager
- [Taskbook](https://github.com/klaussinani/taskbook) - Task and note management
- [Dnote](https://github.com/dnote/dnote) - Command line notebook

## Technical References & Frameworks

### Content Management Patterns

- **Bartholomew CLI** - Study their post creation approach
  - [Pages Abstraction](https://github.com/fermyon/bartholomew/blob/main/src/content.rs) -
    Content structure implementation

### Styling & UI References

- [Gatsby Lumen Starter](https://github.com/alxshelepenok/gatsby-starter-lumen) -
  Clean blog styling inspiration

### External APIs & Integrations

- [Arxiv API Wrapper](https://github.com/lukasschwab/arxiv.py) - Academic paper
  integration

## Feature Ideas & Roadmap

### Core Features

- **Search** - Full-text search across knowledge base
- **Multiple Storage Options** - File system, Git, Dropbox integration
- **Annotations** - Add context and notes to saved content
- **Repository Saving** - Save to personal repositories

### Advanced Features

- **ML Integration** - Train models to answer questions from personal KG
- **Social Features** - Public comments/notes to surface trending topics
  (HN-style)
- **Content Separation** - Store discussions and links as separate entities
  (e.g., HN comments + links)

### Search Strategy

- **YAGNI Approach** - Start simple, add complexity as needed

## Architecture Concepts

### Data Structure Ideas

- **Git-like Model** - Append-only structure for continuous knowledge building
- **Separation of Concerns** - Treat different content types (links,
  discussions, notes) as distinct entities

### Social Integration Questions

- How does social functionality integrate with personal knowledge management?
- Public vs private knowledge sharing mechanisms
