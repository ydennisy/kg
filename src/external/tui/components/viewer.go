package components

import (
	"fmt"
	"strings"

	"github.com/charmbracelet/bubbles/viewport"
	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"
	"kg-tui/models"
	"kg-tui/utils"
)

// ViewerModel provides a scrollable content viewer
type ViewerModel struct {
	viewport viewport.Model
	content  string
	title    string
	width    int
	height   int
	showHelp bool
}

// NewViewerModel creates a new viewer model
func NewViewerModel(title, content string, width, height int) *ViewerModel {
	vp := viewport.New(width-2, height-6)
	vp.SetContent(content)

	return &ViewerModel{
		viewport: vp,
		content:  content,
		title:    title,
		width:    width,
		height:   height,
		showHelp: true,
	}
}

// Update implements tea.Model
func (v *ViewerModel) Update(msg tea.Msg) (*ViewerModel, tea.Cmd) {
	var cmd tea.Cmd

	switch msg := msg.(type) {
	case tea.WindowSizeMsg:
		v.width = msg.Width
		v.height = msg.Height
		v.viewport.Width = msg.Width - 2
		v.viewport.Height = msg.Height - 6

	case tea.KeyMsg:
		switch msg.String() {
		case "h":
			v.showHelp = !v.showHelp
		}
	}

	v.viewport, cmd = v.viewport.Update(msg)
	return v, cmd
}

// View implements tea.Model
func (v *ViewerModel) View() string {
	var b strings.Builder

	// Title
	if v.title != "" {
		b.WriteString(utils.TitleStyle.Render(v.title) + "\n")
	}

	// Content viewport
	b.WriteString(utils.ContentStyle.Render(v.viewport.View()) + "\n")

	// Help text
	if v.showHelp {
		helpText := "↑/k: Up • ↓/j: Down • h: Toggle help • q: Back"
		b.WriteString(utils.HelpStyle.Render(helpText))
	}

	return b.String()
}

// SetContent updates the viewer content
func (v *ViewerModel) SetContent(content string) {
	v.content = content
	v.viewport.SetContent(content)
}

// NodeViewerModel specialized viewer for displaying nodes
type NodeViewerModel struct {
	viewer *ViewerModel
	node   models.Node
}

// NewNodeViewerModel creates a node viewer
func NewNodeViewerModel(node models.Node, width, height int) *NodeViewerModel {
	title := "📄 " + node.GetDisplayName()
	content := formatNodeContent(node)

	viewer := NewViewerModel(title, content, width, height)

	return &NodeViewerModel{
		viewer: viewer,
		node:   node,
	}
}

// Update implements tea.Model
func (n *NodeViewerModel) Update(msg tea.Msg) (*NodeViewerModel, tea.Cmd) {
	var cmd tea.Cmd
	n.viewer, cmd = n.viewer.Update(msg)
	return n, cmd
}

// View implements tea.Model
func (n *NodeViewerModel) View() string {
	return n.viewer.View()
}

// formatNodeContent formats a node for display
func formatNodeContent(node models.Node) string {
	var b strings.Builder

	// Basic information
	b.WriteString(utils.SubtitleStyle.Render("📋 Basic Information") + "\n")
	b.WriteString(fmt.Sprintf("%-12s %s\n", "ID:", node.ID))
	b.WriteString(fmt.Sprintf("%-12s %s\n", "Type:", utils.FormatNodeType(string(node.Type))))
	b.WriteString(fmt.Sprintf("%-12s %s\n", "Title:", node.Title))

	visibility := "🔒 Private"
	if node.IsPublic {
		visibility = "🌐 Public"
	}
	b.WriteString(fmt.Sprintf("%-12s %s\n", "Visibility:", visibility))
	b.WriteString(fmt.Sprintf("%-12s %s\n", "Created:", node.CreatedAt.Format("2006-01-02 15:04:05")))
	b.WriteString(fmt.Sprintf("%-12s %s\n\n", "Updated:", node.UpdatedAt.Format("2006-01-02 15:04:05")))

	// Type-specific data
	b.WriteString(utils.SubtitleStyle.Render("📊 Data") + "\n")
	switch node.Type {
	case models.NodeTypeNote:
		if content := node.GetDataString("content"); content != "" {
			b.WriteString(utils.ContentStyle.Render(content) + "\n")
		}

	case models.NodeTypeLink:
		if url := node.GetDataString("url"); url != "" {
			b.WriteString(fmt.Sprintf("%-12s %s\n", "URL:", url))
		}
		if text := node.GetDataString("text"); text != "" {
			b.WriteString("\nContent:\n")
			b.WriteString(utils.ContentStyle.Render(text) + "\n")
		}

	case models.NodeTypeTag:
		if name := node.GetDataString("name"); name != "" {
			b.WriteString(fmt.Sprintf("%-12s %s\n", "Name:", name))
		}

	case models.NodeTypeFlashcard:
		if front := node.GetDataString("front"); front != "" {
			b.WriteString(utils.SubtitleStyle.Render("🎯 Front:") + "\n")
			b.WriteString(utils.ContentStyle.Render(front) + "\n\n")
		}
		if back := node.GetDataString("back"); back != "" {
			b.WriteString(utils.SubtitleStyle.Render("💡 Back:") + "\n")
			b.WriteString(utils.ContentStyle.Render(back) + "\n")
		}
	}

	// Raw JSON data
	b.WriteString("\n" + utils.SubtitleStyle.Render("🔧 Raw JSON") + "\n")
	b.WriteString("```json\n")
	b.WriteString(node.ToJSON() + "\n")
	b.WriteString("```\n")

	return b.String()
}

// ProgressViewerModel shows progress for long-running operations
type ProgressViewerModel struct {
	message     string
	progress    float64
	showSpinner bool
	spinnerPos  int
	width       int
	height      int
}

// NewProgressViewerModel creates a progress viewer
func NewProgressViewerModel(message string, width, height int) *ProgressViewerModel {
	return &ProgressViewerModel{
		message:     message,
		showSpinner: true,
		width:       width,
		height:      height,
	}
}

// Update implements tea.Model
func (p *ProgressViewerModel) Update(msg tea.Msg) (*ProgressViewerModel, tea.Cmd) {
	switch msg := msg.(type) {
	case tea.WindowSizeMsg:
		p.width = msg.Width
		p.height = msg.Height
	}

	// Animate spinner
	if p.showSpinner {
		p.spinnerPos = (p.spinnerPos + 1) % 4
	}

	return p, nil
}

// View implements tea.Model
func (p *ProgressViewerModel) View() string {
	var b strings.Builder

	// Message
	b.WriteString(utils.SubtitleStyle.Render(p.message) + "\n\n")

	// Spinner or progress bar
	if p.showSpinner {
		spinnerChars := []string{"⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"}
		spinner := spinnerChars[p.spinnerPos%len(spinnerChars)]
		b.WriteString(lipgloss.NewStyle().Foreground(utils.ColorPrimary).Render(spinner+" Processing...") + "\n")
	} else {
		// Progress bar
		barWidth := p.width - 10
		if barWidth < 10 {
			barWidth = 10
		}

		filled := int(p.progress * float64(barWidth))
		bar := strings.Repeat("=", filled) + strings.Repeat("-", barWidth-filled)

		progressText := lipgloss.NewStyle().Bold(true).Render("Progress: ")
		progressBar := lipgloss.NewStyle().Foreground(utils.ColorPrimary).Render(bar)
		progressPercent := lipgloss.NewStyle().Foreground(utils.ColorMuted).Render(fmt.Sprintf(" (%.1f%%)", p.progress*100))

		b.WriteString(progressText + progressBar + progressPercent + "\n")
	}

	b.WriteString("\n" + utils.HelpStyle.Render("Please wait..."))

	return b.String()
}

// SetMessage updates the progress message
func (p *ProgressViewerModel) SetMessage(message string) {
	p.message = message
}

// SetProgress sets the progress (0.0 to 1.0)
func (p *ProgressViewerModel) SetProgress(progress float64) {
	p.progress = progress
	p.showSpinner = false
}
