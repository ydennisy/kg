package components

import (
	"strings"

	"github.com/charmbracelet/lipgloss"
	tea "github.com/charmbracelet/bubbletea"
	"kg-tui/utils"
)

// NavigationOption represents a menu option
type NavigationOption struct {
	Key         string
	Label       string
	Description string
	Value       interface{}
	Enabled     bool
}

// NavigationModel provides keyboard-driven menu navigation
type NavigationModel struct {
	options       []NavigationOption
	selectedIndex int
	title         string
	width         int
	height        int
	showKeys      bool
}

// NewNavigationModel creates a new navigation model
func NewNavigationModel(title string, options []NavigationOption, width, height int) *NavigationModel {
	// Enable all options by default
	for i := range options {
		options[i].Enabled = true
	}

	return &NavigationModel{
		options:  options,
		title:    title,
		width:    width,
		height:   height,
		showKeys: true,
	}
}

// Update implements tea.Model
func (n *NavigationModel) Update(msg tea.Msg) (*NavigationModel, tea.Cmd) {
	switch msg := msg.(type) {
	case tea.WindowSizeMsg:
		n.width = msg.Width
		n.height = msg.Height

	case tea.KeyMsg:
		switch msg.String() {
		case "down", "j":
			n.nextOption()
		case "up", "k":
			n.prevOption()
		case "h":
			n.showKeys = !n.showKeys
		default:
			// Check for direct key navigation
			for i, option := range n.options {
				if option.Key == msg.String() && option.Enabled {
					n.selectedIndex = i
					return n, nil
				}
			}
		}
	}

	return n, nil
}

// View implements tea.Model
func (n *NavigationModel) View() string {
	var b strings.Builder

	// Title
	if n.title != "" {
		b.WriteString(utils.TitleStyle.Render(n.title) + "\n\n")
	}

	// Options
	for i, option := range n.options {
		if !option.Enabled {
			continue
		}

		// Format key hint
		keyHint := ""
		if n.showKeys && option.Key != "" {
			keyHint = lipgloss.NewStyle().
				Foreground(utils.ColorSecondary).
				Render("[" + option.Key + "]")
		}

		// Format option label with proper spacing
		var labelStyle lipgloss.Style
		var prefix string
		if i == n.selectedIndex {
			labelStyle = lipgloss.NewStyle().Foreground(utils.ColorPrimary).Bold(true)
			prefix = "▸ "
		} else {
			labelStyle = lipgloss.NewStyle().Foreground(utils.ColorMuted)
			prefix = "  "
		}

		// Format the main label with selected indicator
		label := labelStyle.Render(prefix + option.Label)

		// Combine key hint and label on a single line
		line := ""
		if keyHint != "" {
			line = lipgloss.JoinHorizontal(lipgloss.Left, keyHint, " ", label)
		} else {
			line = label
		}

		// Add the line to the output with single newline
		b.WriteString(line + "\n")
	}

	// Help text
	helpText := "↑/k: Up • ↓/j: Down • Enter: Select"
	if n.showKeys {
		helpText += " • [key]: Quick select • h: Hide keys"
	} else {
	helpText += " • h: Show keys"
	}

	b.WriteString("\n" + utils.HelpStyle.Render(helpText))

	return b.String()
}

// GetSelectedOption returns the currently selected option
func (n *NavigationModel) GetSelectedOption() NavigationOption {
	if n.selectedIndex >= 0 && n.selectedIndex < len(n.options) {
		return n.options[n.selectedIndex]
	}
	return NavigationOption{}
}

// GetSelectedValue returns the value of the currently selected option
func (n *NavigationModel) GetSelectedValue() interface{} {
	return n.GetSelectedOption().Value
}

// SetOptions updates the navigation options
func (n *NavigationModel) SetOptions(options []NavigationOption) {
	n.options = options
	if n.selectedIndex >= len(options) {
		n.selectedIndex = 0
	}
}

// Helper methods

func (n *NavigationModel) nextOption() {
	start := n.selectedIndex
	for {
		n.selectedIndex = (n.selectedIndex + 1) % len(n.options)
		if n.options[n.selectedIndex].Enabled || n.selectedIndex == start {
			break
		}
	}
}

func (n *NavigationModel) prevOption() {
	start := n.selectedIndex
	for {
		n.selectedIndex = (n.selectedIndex - 1 + len(n.options)) % len(n.options)
		if n.options[n.selectedIndex].Enabled || n.selectedIndex == start {
			break
		}
	}
}

// BreadcrumbModel shows navigation breadcrumbs
type BreadcrumbModel struct {
	items  []string
	width  int
	height int
}

// NewBreadcrumbModel creates a breadcrumb navigation
func NewBreadcrumbModel(items []string, width, height int) *BreadcrumbModel {
	return &BreadcrumbModel{
		items:  items,
		width:  width,
		height: height,
	}
}

// Update implements tea.Model
func (b *BreadcrumbModel) Update(msg tea.Msg) (*BreadcrumbModel, tea.Cmd) {
	switch msg := msg.(type) {
	case tea.WindowSizeMsg:
		b.width = msg.Width
		b.height = msg.Height
	}
	return b, nil
}

// View implements tea.Model
func (b *BreadcrumbModel) View() string {
	if len(b.items) == 0 {
		return ""
	}

	var parts []string
	for i, item := range b.items {
		if i == len(b.items)-1 {
			// Current/last item
			parts = append(parts, utils.ActiveItemStyle.Render(item))
		} else {
			// Previous items
			parts = append(parts, utils.MutedStyle.Render(item))
		}
	}

	breadcrumb := strings.Join(parts, utils.MutedStyle.Render(" > "))
	return breadcrumb + "\n"
}

// SetItems updates the breadcrumb items
func (b *BreadcrumbModel) SetItems(items []string) {
	b.items = items
}

// AddItem adds an item to the breadcrumb
func (b *BreadcrumbModel) AddItem(item string) {
	b.items = append(b.items, item)
}

// PopItem removes the last item from the breadcrumb
func (b *BreadcrumbModel) PopItem() {
	if len(b.items) > 0 {
		b.items = b.items[:len(b.items)-1]
	}
}
