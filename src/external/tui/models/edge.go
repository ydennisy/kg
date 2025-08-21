package models

import "time"

// EdgeType represents the different types of relationships between nodes
type EdgeType string

const (
	EdgeTypeReferences EdgeType = "references"
	EdgeTypeContains   EdgeType = "contains"
	EdgeTypeTaggedWith EdgeType = "tagged_with"
	EdgeTypeSimilarTo  EdgeType = "similar_to"
	EdgeTypeRespondsTo EdgeType = "responds_to"
)

// Edge represents a relationship between two nodes
type Edge struct {
	ID        string    `json:"id"`
	SourceID  string    `json:"sourceId"`
	TargetID  string    `json:"targetId"`
	Type      EdgeType  `json:"type,omitempty"`
	CreatedAt time.Time `json:"createdAt"`
}

// LinkNodesRequest represents the request to link two nodes
type LinkNodesRequest struct {
	SourceID string   `json:"sourceId"`
	TargetID string   `json:"targetId"`
	Type     EdgeType `json:"type,omitempty"`
}

// LinkNodesResponse represents the response from linking nodes
type LinkNodesResponse struct {
	OK    bool   `json:"ok"`
	Error string `json:"error,omitempty"`
}
