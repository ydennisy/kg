# Knowledge Graph TUI (Go Implementation)

A terminal user interface (TUI) implementation of the Knowledge Graph CLI using Go and the Charm Bracelet ecosystem.

## Overview

This is a proof-of-concept implementation that replicates the functionality of the TypeScript CLI using:
- [Bubble Tea](https://github.com/charmbracelet/bubbletea) - TUI framework 
- [Bubbles](https://github.com/charmbracelet/bubbles) - TUI components
- [Lip Gloss](https://github.com/charmbracelet/lipgloss) - Styling and layout

## Features

### ✅ Implemented
- **Main Menu Navigation** - Keyboard-driven menu system
- **Node Creation** - Multi-step forms for all node types (note, link, tag, flashcard)
- **Search Functionality** - Search existing nodes with highlighted results
- **Node Viewing** - Full-screen node viewer with JSON display
- **Flashcard Generation** - AI-powered flashcard creation workflow
- **Flashcard Review** - Interactive card review and selection
- **Site Publishing** - Static site generation simulation
- **Consistent Styling** - Professional color scheme and layout

### 🔄 Mock Data
All functionality uses mock data services. No actual HTTP connections to the Node.js backend.

## Architecture

```
src/external/tui/
├── go.mod                   # Go module definition
├── main.go                  # Application entry point
├── models/                  # Data structures and mock services
├── components/              # Reusable UI components  
├── screens/                 # Application screens
└── utils/                   # Styling and helper functions
```

### Key Components

- **Navigation Model** - Menu navigation with keyboard shortcuts
- **Form Model** - Multi-field forms with validation
- **List Models** - Searchable and selectable lists
- **Viewer Models** - Content viewers with scrolling
- **Confirmation Model** - Yes/No dialogs

### Screens

- **Main Menu** - Application entry point
- **Create Node** - Multi-step node creation workflow
- **Search Nodes** - Search and view existing nodes
- **Generate Flashcards** - AI flashcard generation
- **Flashcard Review** - Review and select generated cards
- **Publish Site** - Static site generation
- **Node Viewer** - Full node display
- **Loading** - Progress indication

## Usage

### Prerequisites

- Go 1.21 or later
- Terminal with 256-color support

### Installation

```bash
cd src/external/tui
go mod tidy
go build -o kg-tui main.go
```

### Running

```bash
./kg-tui
```

### Controls

- **Arrow Keys / vim keys (j/k)** - Navigation
- **Enter** - Select/Confirm
- **Tab/Shift+Tab** - Navigate form fields
- **q** - Quit/Back
- **esc** - Cancel/Back
- **Letter keys** - Quick menu shortcuts

## Project Structure

### Models Layer
- `Node` - Core node data structure
- `Edge` - Node relationship data
- `MockDataService` - Simulates backend API calls

### Components Layer
- Reusable UI elements
- Form handling and validation
- List management and selection
- Content viewing and scrolling

### Screens Layer
- Application state management
- Screen-specific business logic
- User interaction handling

### Utils Layer
- Consistent styling with Lip Gloss
- String manipulation helpers
- Input validation

## Development Notes

This is a **proof-of-concept** implementation focusing on:

1. **TUI Architecture** - Demonstrating Bubble Tea patterns
2. **Component Reusability** - Building modular UI components
3. **State Management** - Handling complex multi-screen flows
4. **Styling Consistency** - Professional appearance
5. **User Experience** - Intuitive keyboard navigation

### Missing Features
- HTTP API integration
- Real data persistence
- Error handling for network operations
- Configuration management
- Plugin/extension system

## Future Enhancements

1. **Backend Integration** - Connect to Node.js API
2. **Real-time Updates** - Live data synchronization  
3. **Plugin System** - Extensible functionality
4. **Configuration** - User preferences and settings
5. **Performance** - Optimization for large datasets
6. **Testing** - Comprehensive test coverage

## License

Same as parent project.