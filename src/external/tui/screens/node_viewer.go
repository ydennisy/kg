package screens

import (
	tea "github.com/charmbracelet/bubbletea"
	"kg-tui/components"
	"kg-tui/models"
)

// NodeViewerModel represents the node viewing screen
type NodeViewerModel struct {
	viewer *components.NodeViewerModel
	node   models.Node
	width  int
	height int
}

// NewNodeViewerModel creates a new node viewer
func NewNodeViewerModel(node models.Node) *NodeViewerModel {
	viewer := components.NewNodeViewerModel(node, 80, 20)

	return &NodeViewerModel{
		viewer: viewer,
		node:   node,
		width:  80,
		height: 20,
	}
}

// Init implements tea.Model
func (n *NodeViewerModel) Init() tea.Cmd {
	return nil
}

// Update implements tea.Model
func (n *NodeViewerModel) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	var cmd tea.Cmd

	switch msg := msg.(type) {
	case tea.WindowSizeMsg:
		n.width = msg.Width
		n.height = msg.Height

	case tea.KeyMsg:
		switch msg.String() {
		case "q", "esc":
			return n, func() tea.Msg {
				return BackToMainMenuMsg{}
			}
		}
	}

	n.viewer, cmd = n.viewer.Update(msg)
	return n, cmd
}

// View implements tea.Model
func (n *NodeViewerModel) View() string {
	return n.viewer.View()
}
