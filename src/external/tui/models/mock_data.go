package models

import (
	"fmt"
	"math/rand"
	"strings"
	"time"
)

// MockDataService provides mock data for the TUI POC
type MockDataService struct {
	nodes []Node
}

// NewMockDataService creates a new mock data service with sample data
func NewMockDataService() *MockDataService {
	service := &MockDataService{}
	service.generateSampleNodes()
	return service
}

// generateSampleNodes creates sample nodes for demonstration
func (m *MockDataService) generateSampleNodes() {
	now := time.Now()

	m.nodes = []Node{
		{
			ID:        "node-001",
			Type:      NodeTypeNote,
			Title:     "Getting Started with Go",
			IsPublic:  true,
			CreatedAt: now.AddDate(0, -1, -5),
			UpdatedAt: now.AddDate(0, -1, -5),
			Data: map[string]interface{}{
				"content": "Go is a statically typed, compiled programming language designed at Google. It's syntactically similar to C, but with memory safety, garbage collection, structural typing, and CSP-style concurrency.",
			},
		},
		{
			ID:        "node-002",
			Type:      NodeTypeLink,
			Title:     "The Go Programming Language Specification",
			IsPublic:  true,
			CreatedAt: now.AddDate(0, -1, -3),
			UpdatedAt: now.AddDate(0, -1, -3),
			Data: map[string]interface{}{
				"url":  "https://golang.org/ref/spec",
				"text": "The Go programming language is an open source project to make programmers more productive. Go is expressive, concise, clean, and efficient.",
			},
		},
		{
			ID:        "node-003",
			Type:      NodeTypeTag,
			Title:     "programming",
			IsPublic:  false,
			CreatedAt: now.AddDate(0, -2, 0),
			UpdatedAt: now.AddDate(0, -2, 0),
			Data: map[string]interface{}{
				"name": "programming",
			},
		},
		{
			ID:        "node-004",
			Type:      NodeTypeFlashcard,
			Title:     "What is a goroutine?",
			IsPublic:  true,
			CreatedAt: now.AddDate(0, 0, -1),
			UpdatedAt: now.AddDate(0, 0, -1),
			Data: map[string]interface{}{
				"front": "What is a goroutine?",
				"back":  "A goroutine is a lightweight thread managed by the Go runtime. Goroutines are multiplexed onto multiple OS threads so if one should block, others continue to run.",
			},
		},
		{
			ID:        "node-005",
			Type:      NodeTypeNote,
			Title:     "Bubble Tea Architecture",
			IsPublic:  false,
			CreatedAt: now.AddDate(0, 0, -2),
			UpdatedAt: now.AddDate(0, 0, -1),
			Data: map[string]interface{}{
				"content": "Bubble Tea follows the Elm Architecture with Model-View-Update pattern. The model holds application state, view renders the UI, and update handles messages to modify state.",
			},
		},
		{
			ID:        "node-006",
			Type:      NodeTypeLink,
			Title:     "Charm Bracelet GitHub",
			IsPublic:  true,
			CreatedAt: now.AddDate(0, 0, -7),
			UpdatedAt: now.AddDate(0, 0, -7),
			Data: map[string]interface{}{
				"url":  "https://github.com/charmbracelet",
				"text": "We build tools to make the command line glamorous. Bubble Tea, Glow, Charm, and more.",
			},
		},
		{
			ID:        "node-007",
			Type:      NodeTypeFlashcard,
			Title:     "What is the defer statement in Go?",
			IsPublic:  true,
			CreatedAt: now.AddDate(0, 0, -3),
			UpdatedAt: now.AddDate(0, 0, -3),
			Data: map[string]interface{}{
				"front": "What is the defer statement in Go?",
				"back":  "The defer statement defers the execution of a function until the surrounding function returns. Deferred calls are executed in Last In First Out (LIFO) order.",
			},
		},
	}
}

// CreateNode mocks creating a new node
func (m *MockDataService) CreateNode(req CreateNodeRequest) CreateNodeResponse {
	// Simulate some processing delay
	time.Sleep(100 * time.Millisecond)

	// Generate a new ID
	id := fmt.Sprintf("node-%03d", len(m.nodes)+1)

	// Ensure title is set
	title := req.Title
	if title == "" {
		title = m.generateDefaultTitle(req.Type, req.Data)
	}

	// Create the new node
	node := Node{
		ID:        id,
		Type:      req.Type,
		Title:     title,
		IsPublic:  req.IsPublic,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
		Data:      req.Data,
	}

	// Add to our mock store
	m.nodes = append(m.nodes, node)

	return CreateNodeResponse{
		OK:     true,
		Result: &node,
	}
}

// SearchNodes mocks searching for nodes
func (m *MockDataService) SearchNodes(query string) SearchNodesResponse {
	// Simulate some processing delay
	time.Sleep(200 * time.Millisecond)

	if query == "" {
		return SearchNodesResponse{OK: true, Result: []SearchResult{}}
	}

	var results []SearchResult
	queryLower := strings.ToLower(query)

	for _, node := range m.nodes {
		score := 0.0
		snippet := ""

		// Check title match
		if strings.Contains(strings.ToLower(node.Title), queryLower) {
			score += 0.8
			snippet = node.Title
		}

		// Check data content match
		if content := node.GetDataString("content"); content != "" && strings.Contains(strings.ToLower(content), queryLower) {
			score += 0.6
			snippet = m.highlightSnippet(content, query)
		}

		// Check URL match for links
		if url := node.GetDataString("url"); url != "" && strings.Contains(strings.ToLower(url), queryLower) {
			score += 0.7
			snippet = m.highlightSnippet(url, query)
		}

		// Check name match for tags
		if name := node.GetDataString("name"); name != "" && strings.Contains(strings.ToLower(name), queryLower) {
			score += 0.9
			snippet = m.highlightSnippet(name, query)
		}

		// Check flashcard content
		if front := node.GetDataString("front"); front != "" && strings.Contains(strings.ToLower(front), queryLower) {
			score += 0.7
			snippet = m.highlightSnippet(front, query)
		}

		if score > 0 {
			results = append(results, SearchResult{
				Node:    node,
				Snippet: snippet,
				Score:   score + rand.Float64()*0.1, // Add some randomness
			})
		}
	}

	return SearchNodesResponse{
		OK:     true,
		Result: results,
	}
}

// GetNode mocks getting a single node by ID
func (m *MockDataService) GetNode(id string) (*Node, error) {
	time.Sleep(50 * time.Millisecond)

	for _, node := range m.nodes {
		if node.ID == id {
			return &node, nil
		}
	}

	return nil, fmt.Errorf("node not found")
}

// GenerateFlashcards mocks generating flashcards from a node
func (m *MockDataService) GenerateFlashcards(nodeID string) GenerateFlashcardsResponse {
	// Simulate AI processing delay
	time.Sleep(2 * time.Second)

	node, err := m.GetNode(nodeID)
	if err != nil {
		return GenerateFlashcardsResponse{
			OK:    false,
			Error: "Node not found",
		}
	}

	// Generate mock flashcards based on the node content
	flashcards := []Flashcard{
		{
			Front: fmt.Sprintf("What is the main topic of '%s'?", node.Title),
			Back:  fmt.Sprintf("The main topic is about %s as described in the content.", strings.ToLower(string(node.Type))),
		},
		{
			Front: fmt.Sprintf("When was '%s' created?", node.Title),
			Back:  fmt.Sprintf("It was created on %s", node.CreatedAt.Format("January 2, 2006")),
		},
	}

	// Add type-specific flashcards
	switch node.Type {
	case NodeTypeNote:
		if content := node.GetDataString("content"); len(content) > 50 {
			flashcards = append(flashcards, Flashcard{
				Front: "What are the key points from this note?",
				Back:  content[:100] + "...",
			})
		}
	case NodeTypeLink:
		if url := node.GetDataString("url"); url != "" {
			flashcards = append(flashcards, Flashcard{
				Front: fmt.Sprintf("What is the URL for '%s'?", node.Title),
				Back:  url,
			})
		}
	}

	return GenerateFlashcardsResponse{
		OK:     true,
		Result: flashcards,
	}
}

// LinkNodes mocks linking two nodes
func (m *MockDataService) LinkNodes(req LinkNodesRequest) LinkNodesResponse {
	time.Sleep(100 * time.Millisecond)

	// Verify both nodes exist
	sourceExists := false
	targetExists := false

	for _, node := range m.nodes {
		if node.ID == req.SourceID {
			sourceExists = true
		}
		if node.ID == req.TargetID {
			targetExists = true
		}
	}

	if !sourceExists {
		return LinkNodesResponse{
			OK:    false,
			Error: "Source node not found",
		}
	}

	if !targetExists {
		return LinkNodesResponse{
			OK:    false,
			Error: "Target node not found",
		}
	}

	// In a real implementation, we'd store the edge
	return LinkNodesResponse{
		OK: true,
	}
}

// PublishSite mocks publishing the site
func (m *MockDataService) PublishSite() PublishSiteResponse {
	// Simulate site generation delay
	time.Sleep(3 * time.Second)

	// Count public nodes
	publicCount := 0
	for _, node := range m.nodes {
		if node.IsPublic {
			publicCount++
		}
	}

	return PublishSiteResponse{
		OK: true,
		Result: struct {
			FilesGenerated int    `json:"filesGenerated"`
			OutputDir      string `json:"outputDir"`
		}{
			FilesGenerated: publicCount + 2, // +2 for index and CSS
			OutputDir:      "./public",
		},
	}
}

// Helper methods

func (m *MockDataService) generateDefaultTitle(nodeType NodeType, data map[string]interface{}) string {
	switch nodeType {
	case NodeTypeNote:
		return "Untitled Note"
	case NodeTypeLink:
		if url, ok := data["url"].(string); ok {
			return url
		}
		return "Untitled Link"
	case NodeTypeTag:
		if name, ok := data["name"].(string); ok {
			return name
		}
		return "Untitled Tag"
	case NodeTypeFlashcard:
		if front, ok := data["front"].(string); ok {
			return front
		}
		return "Untitled Flashcard"
	default:
		return "Untitled"
	}
}

func (m *MockDataService) highlightSnippet(content, query string) string {
	const maxLen = 100

	queryLower := strings.ToLower(query)
	contentLower := strings.ToLower(content)

	// Find the position of the query in the content
	pos := strings.Index(contentLower, queryLower)
	if pos == -1 {
		// If not found, return truncated content
		if len(content) > maxLen {
			return content[:maxLen] + "..."
		}
		return content
	}

	// Extract snippet around the match
	start := pos - 20
	if start < 0 {
		start = 0
	}

	end := pos + len(query) + 20
	if end > len(content) {
		end = len(content)
	}

	snippet := content[start:end]

	// Add highlighting markers
	highlighted := strings.ReplaceAll(snippet, query, "<b>"+query+"</b>")

	if len(highlighted) > maxLen {
		return highlighted[:maxLen] + "..."
	}

	return highlighted
}
