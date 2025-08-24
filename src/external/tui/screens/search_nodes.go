package screens

import (
	"strings"
	"time"

	"github.com/charmbracelet/bubbles/textinput"
	"github.com/charmbracelet/lipgloss"
	tea "github.com/charmbracelet/bubbletea"
	"kg-tui/components"
	"kg-tui/models"
	"kg-tui/utils"
)

// SearchNodesState represents the current state of search
type SearchNodesState int

const (
	SearchNodesInput SearchNodesState = iota
	SearchNodesResults
	SearchNodesViewing
	SearchNodesEmpty
)

// SearchNodesModel represents the search screen
type SearchNodesModel struct {
	state       SearchNodesState
	dataService *models.MockDataService
	width       int
	height      int

	// UI components
	searchInput textinput.Model
	resultsList *components.SearchResultsListModel
	nodeViewer  *components.NodeViewerModel

	// State data
	query        string
	results      []models.SearchResult
	selectedNode *models.Node
	isSearching  bool
	errorMessage string
}

// NewSearchNodesModel creates a new search model
func NewSearchNodesModel(dataService *models.MockDataService, width, height int) *SearchNodesModel {
	// Create search input
	input := textinput.New()
	input.Placeholder = "Enter search query..."
	input.Focus()
	input.Width = width - 20

	return &SearchNodesModel{
		state:       SearchNodesInput,
		dataService: dataService,
		searchInput: input,
		width:       width,
		height:      height,
	}
}

// Init implements tea.Model
func (s *SearchNodesModel) Init() tea.Cmd {
	return nil
}

// Update implements tea.Model
func (s *SearchNodesModel) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	var cmd tea.Cmd

	switch msg := msg.(type) {
	case tea.WindowSizeMsg:
		s.width = msg.Width
		s.height = msg.Height
		s.searchInput.Width = msg.Width - 20

	case tea.KeyMsg:
		switch msg.String() {
		case "q":
			if s.state == SearchNodesInput || s.state == SearchNodesEmpty {
				return s, func() tea.Msg {
					return BackToMainMenuMsg{}
				}
			}
		case "esc":
			return s.handleEscape()
		}

	case searchCompleteMsg:
		s.handleSearchComplete(msg.results, msg.err)
		return s, nil
	}

	// Route to appropriate state handler
	switch s.state {
	case SearchNodesInput, SearchNodesEmpty:
		return s.updateSearchInput(msg)
	case SearchNodesResults:
		return s.updateResultsList(msg)
	case SearchNodesViewing:
		return s.updateNodeViewing(msg)
	}

	return s, cmd
}

// View implements tea.Model
func (s *SearchNodesModel) View() string {
	var content string

	switch s.state {
	case SearchNodesInput:
		content = s.viewSearchInput()
	case SearchNodesResults:
		content = s.resultsList.View()
	case SearchNodesViewing:
		content = s.nodeViewer.View()
	case SearchNodesEmpty:
		content = s.viewEmpty()
	}

	if s.errorMessage != "" {
		content += "\n" + utils.ErrorStyle.Render("❌ "+s.errorMessage)
	}

	return lipgloss.JoinVertical(lipgloss.Left,
		utils.TitleStyle.Render("🔍 Search Knowledge Graph"),
		content,
		utils.HelpStyle.Render(s.getFooterHelp()),
	)
}

// State-specific update methods

func (s *SearchNodesModel) updateSearchInput(msg tea.Msg) (tea.Model, tea.Cmd) {
	var cmd tea.Cmd

	switch msg := msg.(type) {
	case tea.KeyMsg:
		switch msg.String() {
		case "enter":
			if !s.isSearching && strings.TrimSpace(s.searchInput.Value()) != "" {
				s.query = strings.TrimSpace(s.searchInput.Value())
				s.isSearching = true
				return s, s.performSearch()
			}
		}
	}

	s.searchInput, cmd = s.searchInput.Update(msg)
	return s, cmd
}

func (s *SearchNodesModel) updateResultsList(msg tea.Msg) (tea.Model, tea.Cmd) {
	var cmd tea.Cmd

	switch msg := msg.(type) {
	case tea.KeyMsg:
		switch msg.String() {
		case "enter":
			if node := s.resultsList.SelectedNode(); node != nil {
				s.selectedNode = node
				s.nodeViewer = components.NewNodeViewerModel(*node, s.width, s.height)
				s.state = SearchNodesViewing
				return s, nil
			}
		case "/":
			// Return to search input
			s.state = SearchNodesInput
			s.searchInput.Focus()
			return s, nil
		}
	}

	s.resultsList, cmd = s.resultsList.Update(msg)
	return s, cmd
}

func (s *SearchNodesModel) updateNodeViewing(msg tea.Msg) (tea.Model, tea.Cmd) {
	var cmd tea.Cmd

	switch msg := msg.(type) {
	case tea.KeyMsg:
		switch msg.String() {
		case "esc", "q":
			// Return to results
			s.state = SearchNodesResults
			return s, nil
		}
	}

	s.nodeViewer, cmd = s.nodeViewer.Update(msg)
				return s, cmd
	return s, cmd
}

// State-specific view methods

func (s *SearchNodesModel) viewSearchInput() string {
	var content strings.Builder

	content.WriteString(utils.SubtitleStyle.Render("Enter your search query:") + "\n\n")

	// Search input
	inputStyle := utils.InputStyle
	if s.searchInput.Focused() {
		inputStyle = utils.FocusedInputStyle
	}

	searchBox := inputStyle.Render(s.searchInput.View())
	content.WriteString(searchBox + "\n\n")

	if s.isSearching {
		content.WriteString(utils.MutedStyle.Render("🔍 Searching...") + "\n")
	} else {
		content.WriteString(utils.HelpStyle.Render("Type your search term and press Enter to search") + "\n")
	}

	return content.String()
}



func (s *SearchNodesModel) viewEmpty() string {
	return utils.MutedStyle.Render("No search performed yet. Enter a search query to get started.")
}

// Helper methods

func (s *SearchNodesModel) handleEscape() (tea.Model, tea.Cmd) {
	switch s.state {
	case SearchNodesInput, SearchNodesEmpty:
		return s, func() tea.Msg {
			return BackToMainMenuMsg{}
		}
	case SearchNodesResults:
		s.state = SearchNodesInput
		s.searchInput.Focus()
		return s, nil
	case SearchNodesViewing:
		s.state = SearchNodesResults
		return s, nil
	}
	return s, nil
}

func (s *SearchNodesModel) getFooterHelp() string {
	switch s.state {
	case SearchNodesInput:
		return utils.HelpStyle.Render("Enter: Search • q: Back to main menu")
	case SearchNodesResults:
		return utils.HelpStyle.Render("Enter: View node • /: New search • esc: Back to search • q: Main menu")
	case SearchNodesViewing:
		return utils.HelpStyle.Render("esc/q: Back to results • ↑/↓: Scroll")
	case SearchNodesEmpty:
		return utils.HelpStyle.Render("q: Back to main menu")
	}
	return ""
}

func (s *SearchNodesModel) performSearch() tea.Cmd {
	return func() tea.Msg {
		// Simulate async search
		time.Sleep(100 * time.Millisecond)

		response := s.dataService.SearchNodes(s.query)
		return searchCompleteMsg{
			results: response.Result,
			err:     response.Error,
		}
	}
}

func (s *SearchNodesModel) handleSearchComplete(results []models.SearchResult, errMsg string) {
	s.isSearching = false

	if errMsg != "" {
		s.errorMessage = errMsg
		s.state = SearchNodesInput
		return
	}

	s.results = results
	s.errorMessage = ""

	if len(results) > 0 {
		s.resultsList = components.NewSearchResultsListModel(results, s.width, s.height)
		s.state = SearchNodesResults
	} else {
		s.state = SearchNodesEmpty
	}
}

// Custom messages for async operations

type searchCompleteMsg struct {
	results []models.SearchResult
	err     string
}
