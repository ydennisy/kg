package models

import (
	"encoding/json"
	"time"
)

// NodeType represents the different types of nodes
type NodeType string

const (
	NodeTypeNote      NodeType = "note"
	NodeTypeLink      NodeType = "link"
	NodeTypeTag       NodeType = "tag"
	NodeTypeFlashcard NodeType = "flashcard"
)

// Node represents a knowledge graph node
type Node struct {
	ID        string                 `json:"id"`
	Type      NodeType               `json:"type"`
	Title     string                 `json:"title"`
	IsPublic  bool                   `json:"isPublic"`
	CreatedAt time.Time              `json:"createdAt"`
	UpdatedAt time.Time              `json:"updatedAt"`
	Data      map[string]interface{} `json:"data"`
}

// GetDataString safely gets a string value from the data map
func (n *Node) GetDataString(key string) string {
	if val, ok := n.Data[key]; ok {
		if str, ok := val.(string); ok {
			return str
		}
	}
	return ""
}

// GetPreview returns a preview string for the node based on its type
func (n *Node) GetPreview() string {
	const maxLen = 50
	var preview string

	switch n.Type {
	case NodeTypeNote:
		preview = n.GetDataString("content")
	case NodeTypeLink:
		preview = n.GetDataString("url")
	case NodeTypeTag:
		preview = n.GetDataString("name")
	case NodeTypeFlashcard:
		preview = n.GetDataString("front")
	}

	if len(preview) > maxLen {
		return preview[:maxLen] + "..."
	}
	return preview
}

// GetDisplayName returns a formatted display name for lists
func (n *Node) GetDisplayName() string {
	typeStr := "[" + string(n.Type) + "]"
	return typeStr + " " + n.Title
}

// CreateNodeRequest represents the request to create a new node
type CreateNodeRequest struct {
	Type     NodeType               `json:"type"`
	Title    string                 `json:"title,omitempty"`
	Data     map[string]interface{} `json:"data"`
	IsPublic bool                   `json:"isPublic"`
}

// CreateNodeResponse represents the response from creating a node
type CreateNodeResponse struct {
	OK     bool   `json:"ok"`
	Result *Node  `json:"result,omitempty"`
	Error  string `json:"error,omitempty"`
}

// SearchResult represents a search result
type SearchResult struct {
	Node    Node    `json:"node"`
	Snippet string  `json:"snippet"`
	Score   float64 `json:"score"`
}

// SearchNodesResponse represents the response from searching nodes
type SearchNodesResponse struct {
	OK     bool           `json:"ok"`
	Result []SearchResult `json:"result,omitempty"`
	Error  string         `json:"error,omitempty"`
}

// Flashcard represents a flashcard for study
type Flashcard struct {
	Front string `json:"front"`
	Back  string `json:"back"`
}

// GenerateFlashcardsResponse represents the response from generating flashcards
type GenerateFlashcardsResponse struct {
	OK     bool        `json:"ok"`
	Result []Flashcard `json:"result,omitempty"`
	Error  string      `json:"error,omitempty"`
}

// PublishSiteResponse represents the response from publishing the site
type PublishSiteResponse struct {
	OK     bool `json:"ok"`
	Result struct {
		FilesGenerated int    `json:"filesGenerated"`
		OutputDir      string `json:"outputDir"`
	} `json:"result,omitempty"`
	Error string `json:"error,omitempty"`
}

// ToJSON converts a node to JSON string for display
func (n *Node) ToJSON() string {
	data, _ := json.MarshalIndent(n, "", "  ")
	return string(data)
}
