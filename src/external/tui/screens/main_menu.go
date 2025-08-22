package screens

import (
	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"
	"kg-tui/components"
	"kg-tui/utils"
)

// MainMenuModel represents the main menu screen
type MainMenuModel struct {
	navigation *components.NavigationModel
	width      int
	height     int
}

// NewMainMenuModel creates a new main menu model
func NewMainMenuModel() *MainMenuModel {
	options := []components.NavigationOption{
		{
			Key:         "c",
			Label:       "Create Node",
			Description: "Create a new knowledge node (note, link, tag, or flashcard)",
			Value:       "create",
		},
		{
			Key:         "s",
			Label:       "Search Nodes",
			Description: "Search and view existing nodes in your knowledge graph",
			Value:       "search",
		},
		{
			Key:         "g",
			Label:       "Generate Flashcards",
			Description: "Generate AI-powered flashcards from existing content",
			Value:       "flashcards",
		},
		{
			Key:         "p",
			Label:       "Publish Site",
			Description: "Generate static HTML site from public nodes",
			Value:       "publish",
		},
		{
			Key:         "q",
			Label:       "Quit",
			Description: "Exit the Knowledge Graph TUI",
			Value:       "quit",
		},
	}

	// Use a larger height to accommodate the expanded menu items
	nav := components.NewNavigationModel("🔗 Knowledge Graph - Main Menu", options, 80, 30)

	return &MainMenuModel{
		navigation: nav,
		width:      80,
		height:     20,
	}
}

// Init implements tea.Model
func (m *MainMenuModel) Init() tea.Cmd {
	return nil
}

// Update implements tea.Model
func (m *MainMenuModel) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	var cmd tea.Cmd

	switch msg := msg.(type) {
	case tea.WindowSizeMsg:
		m.width = msg.Width
		m.height = msg.Height

	case tea.KeyMsg:
		switch msg.String() {
		case "enter":
			selected := m.navigation.GetSelectedValue().(string)
			return m.handleSelection(selected)
		}
	}

	m.navigation, cmd = m.navigation.Update(msg)
	return m, cmd
}

// View implements tea.Model
func (m *MainMenuModel) View() string {
	// Title
	title := utils.TitleStyle.Render("Knowledge Graph TUI")

	// Menu
	menu := m.navigation.View()

	// Combine title and menu
	return lipgloss.JoinVertical(lipgloss.Left, title, menu)
}

// handleSelection processes menu selection and returns appropriate navigation command
func (m *MainMenuModel) handleSelection(selection string) (tea.Model, tea.Cmd) {
	switch selection {
	case "create":
		return m, func() tea.Msg {
			return NavigateToCreateNodeMsg{}
		}
	case "search":
		return m, func() tea.Msg {
			return NavigateToSearchMsg{}
		}
	case "flashcards":
		return m, func() tea.Msg {
			return NavigateToFlashcardsMsg{}
		}
	case "publish":
		return m, func() tea.Msg {
			return NavigateToPublishMsg{}
		}
	case "quit":
		return m, tea.Quit
	}

	return m, nil
}
