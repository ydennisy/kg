package screens

import (
	"fmt"
	"strings"
	"time"

	"github.com/charmbracelet/bubbles/textinput"
	tea "github.com/charmbracelet/bubbletea"
	"kg-tui/components"
	"kg-tui/models"
	"kg-tui/utils"
)

// GenerateFlashcardsState represents the current state
type GenerateFlashcardsState int

const (
	FlashcardsSelectNode GenerateFlashcardsState = iota
	FlashcardsGenerating
	FlashcardsReview
	FlashcardsComplete
)

// GenerateFlashcardsModel represents the flashcard generation screen
type GenerateFlashcardsModel struct {
	state       GenerateFlashcardsState
	dataService *models.MockDataService
	width       int
	height      int

	// UI components
	searchInput textinput.Model
	nodesList   *components.NodesListModel
	progress    *components.ProgressViewerModel

	// State data
	selectedNode *models.Node
	flashcards   []models.Flashcard
	isSearching  bool
	errorMessage string
}

// NewGenerateFlashcardsModel creates a new flashcard generation model
func NewGenerateFlashcardsModel(dataService *models.MockDataService) *GenerateFlashcardsModel {
	// Create search input for node selection
	input := textinput.New()
	input.Placeholder = "Search for a node to generate flashcards from..."
	input.Focus()
	input.Width = 60

	return &GenerateFlashcardsModel{
		state:       FlashcardsSelectNode,
		dataService: dataService,
		searchInput: input,
		width:       80,
		height:      20,
	}
}

// Init implements tea.Model
func (g *GenerateFlashcardsModel) Init() tea.Cmd {
	return nil
}

// Update implements tea.Model
func (g *GenerateFlashcardsModel) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	var cmd tea.Cmd

	switch msg := msg.(type) {
	case tea.WindowSizeMsg:
		g.width = msg.Width
		g.height = msg.Height
		g.searchInput.Width = msg.Width - 20

	case tea.KeyMsg:
		switch msg.String() {
		case "q":
			if g.state == FlashcardsSelectNode {
				return g, func() tea.Msg {
					return BackToMainMenuMsg{}
				}
			}
		case "esc":
			return g.handleEscape()
		}

	case nodeSearchCompleteMsg:
		g.handleNodeSearchComplete(msg.results, msg.err)
		return g, nil

	case flashcardsGeneratedMsg:
		g.handleFlashcardsGenerated(msg.flashcards, msg.err)
		return g, nil
	}

	// Route to appropriate state handler
	switch g.state {
	case FlashcardsSelectNode:
		return g.updateNodeSelection(msg)
	case FlashcardsGenerating:
		return g.updateGenerating(msg)
	case FlashcardsComplete:
		return g.updateComplete(msg)
	}

	return g, cmd
}

// View implements tea.Model
func (g *GenerateFlashcardsModel) View() string {
	header := utils.TitleStyle.Render("🎯 Generate Flashcards") + "\n\n"

	var content string
	switch g.state {
	case FlashcardsSelectNode:
		content = g.viewNodeSelection()
	case FlashcardsGenerating:
		content = g.viewGenerating()
	case FlashcardsComplete:
		content = g.viewComplete()
	}

	if g.errorMessage != "" {
		content += "\n" + utils.ErrorStyle.Render("❌ "+g.errorMessage)
	}

	footer := "\n" + g.getFooterHelp()

	return header + content + footer
}

// State-specific update methods

func (g *GenerateFlashcardsModel) updateNodeSelection(msg tea.Msg) (tea.Model, tea.Cmd) {
	var cmd tea.Cmd

	switch msg := msg.(type) {
	case tea.KeyMsg:
		switch msg.String() {
		case "enter":
			if g.nodesList != nil {
				if node := g.nodesList.SelectedNode(); node != nil {
					g.selectedNode = node
					g.startGeneration()
					return g, g.generateFlashcards()
				}
			} else if !g.isSearching && strings.TrimSpace(g.searchInput.Value()) != "" {
				// Perform search
				query := strings.TrimSpace(g.searchInput.Value())
				g.isSearching = true
				return g, g.performNodeSearch(query)
			}
		}
	}

	// Update the appropriate component
	if g.nodesList != nil {
		g.nodesList, cmd = g.nodesList.Update(msg)
	} else {
		g.searchInput, cmd = g.searchInput.Update(msg)
	}

	return g, cmd
}

func (g *GenerateFlashcardsModel) updateGenerating(msg tea.Msg) (tea.Model, tea.Cmd) {
	var cmd tea.Cmd

	if g.progress != nil {
		g.progress, cmd = g.progress.Update(msg)
	}

	return g, cmd
}

func (g *GenerateFlashcardsModel) updateComplete(msg tea.Msg) (tea.Model, tea.Cmd) {
	switch msg := msg.(type) {
	case tea.KeyMsg:
		switch msg.String() {
		case "r":
			// Review flashcards
			if len(g.flashcards) > 0 {
				return g, func() tea.Msg {
					return ReviewFlashcardsMsg{Flashcards: g.flashcards}
				}
			}
		case "n":
			// Generate new flashcards
			g.resetState()
			return g, nil
		case "m":
			// Back to main menu
			return g, func() tea.Msg {
				return BackToMainMenuMsg{}
			}
		}
	}

	return g, nil
}

// State-specific view methods

func (g *GenerateFlashcardsModel) viewNodeSelection() string {
	var content strings.Builder

	content.WriteString(utils.SubtitleStyle.Render("Select a node to generate flashcards from:") + "\n\n")

	if g.nodesList != nil {
		// Show search results as selectable list
		content.WriteString(g.nodesList.View())
	} else {
		// Show search input
		inputStyle := utils.InputStyle
		if g.searchInput.Focused() {
			inputStyle = utils.FocusedInputStyle
		}

		searchBox := inputStyle.Render(g.searchInput.View())
		content.WriteString(searchBox + "\n\n")

		if g.isSearching {
			content.WriteString(utils.MutedStyle.Render("🔍 Searching...") + "\n")
		} else {
			content.WriteString(utils.HelpStyle.Render("Type to search for nodes, then press Enter") + "\n")
		}
	}

	return content.String()
}

func (g *GenerateFlashcardsModel) viewGenerating() string {
	var content strings.Builder

	if g.selectedNode != nil {
		content.WriteString(utils.SubtitleStyle.Render("Generating flashcards from:") + "\n")
		content.WriteString(utils.FormatNodeType(string(g.selectedNode.Type)) + " " + g.selectedNode.Title + "\n\n")
	}

	if g.progress != nil {
		content.WriteString(g.progress.View())
	} else {
		content.WriteString(utils.MutedStyle.Render("🎯 Preparing to generate flashcards...") + "\n")
	}

	return content.String()
}

func (g *GenerateFlashcardsModel) viewComplete() string {
	var content strings.Builder

	if len(g.flashcards) > 0 {
		successMsg := fmt.Sprintf("✨ Generated %d flashcards!", len(g.flashcards))
		content.WriteString(utils.SuccessStyle.Render(successMsg) + "\n\n")

		content.WriteString(utils.SubtitleStyle.Render("Preview:") + "\n")
		for i, card := range g.flashcards {
			if i >= 3 { // Show only first 3 cards
				moreMsg := fmt.Sprintf("... and %d more", len(g.flashcards)-3)
				content.WriteString(utils.MutedStyle.Render(moreMsg) + "\n")
				break
			}

			cardTitle := fmt.Sprintf("Card %d:", i+1)
			content.WriteString(utils.ActiveItemStyle.Render(cardTitle) + "\n")
			content.WriteString("🎯 " + utils.TruncateString(card.Front, 60) + "\n")
			content.WriteString("💡 " + utils.TruncateString(card.Back, 60) + "\n\n")
		}

		content.WriteString(utils.SubtitleStyle.Render("What would you like to do?") + "\n")
		content.WriteString(utils.ActiveItemStyle.Render("r") + " Review and select cards to save\n")
		content.WriteString(utils.ActiveItemStyle.Render("n") + " Generate from different node\n")
		content.WriteString(utils.ActiveItemStyle.Render("m") + " Back to main menu\n")
	} else {
		content.WriteString(utils.WarningStyle.Render("⚠️  No flashcards were generated") + "\n\n")
		content.WriteString(utils.MutedStyle.Render("This might happen if the selected node doesn't have enough content") + "\n")
		content.WriteString(utils.MutedStyle.Render("or the content isn't suitable for flashcard generation.") + "\n\n")

		content.WriteString(utils.SubtitleStyle.Render("Options:") + "\n")
		content.WriteString(utils.ActiveItemStyle.Render("n") + " Try with a different node\n")
		content.WriteString(utils.ActiveItemStyle.Render("m") + " Back to main menu\n")
	}

	return content.String()
}

// Helper methods

func (g *GenerateFlashcardsModel) handleEscape() (tea.Model, tea.Cmd) {
	switch g.state {
	case FlashcardsSelectNode:
		if g.nodesList != nil {
			// Return to search input
			g.nodesList = nil
			g.searchInput.Focus()
			return g, nil
		} else {
			// Return to main menu
			return g, func() tea.Msg {
				return BackToMainMenuMsg{}
			}
		}
	case FlashcardsComplete:
		return g, func() tea.Msg {
			return BackToMainMenuMsg{}
		}
	}
	return g, nil
}

func (g *GenerateFlashcardsModel) getFooterHelp() string {
	switch g.state {
	case FlashcardsSelectNode:
		if g.nodesList != nil {
			return utils.HelpStyle.Render("Enter: Select node • esc: Back to search • q: Main menu")
		}
		return utils.HelpStyle.Render("Enter: Search • q: Main menu")
	case FlashcardsGenerating:
		return utils.HelpStyle.Render("Please wait while flashcards are being generated...")
	case FlashcardsComplete:
		return utils.HelpStyle.Render("r: Review cards • n: New generation • m: Main menu")
	}
	return ""
}

func (g *GenerateFlashcardsModel) performNodeSearch(query string) tea.Cmd {
	return func() tea.Msg {
		time.Sleep(100 * time.Millisecond)

		response := g.dataService.SearchNodes(query)
		return nodeSearchCompleteMsg{
			results: response.Result,
			err:     response.Error,
		}
	}
}

func (g *GenerateFlashcardsModel) generateFlashcards() tea.Cmd {
	return func() tea.Msg {
		if g.selectedNode == nil {
			return flashcardsGeneratedMsg{
				flashcards: nil,
				err:        "No node selected",
			}
		}

		// Simulate the generation process with progress updates
		response := g.dataService.GenerateFlashcards(g.selectedNode.ID)

		return flashcardsGeneratedMsg{
			flashcards: response.Result,
			err:        response.Error,
		}
	}
}

func (g *GenerateFlashcardsModel) handleNodeSearchComplete(results []models.SearchResult, errMsg string) {
	g.isSearching = false

	if errMsg != "" {
		g.errorMessage = errMsg
		return
	}

	if len(results) > 0 {
		// Convert search results to nodes
		nodes := make([]models.Node, len(results))
		for i, result := range results {
			nodes[i] = result.Node
		}

		g.nodesList = components.NewNodesListModel(nodes, g.width, g.height)
	} else {
		g.errorMessage = "No nodes found matching your search"
	}
}

func (g *GenerateFlashcardsModel) handleFlashcardsGenerated(flashcards []models.Flashcard, errMsg string) {
	if errMsg != "" {
		g.errorMessage = errMsg
		g.state = FlashcardsSelectNode
		return
	}

	g.flashcards = flashcards
	g.errorMessage = ""
	g.state = FlashcardsComplete
}

func (g *GenerateFlashcardsModel) startGeneration() {
	g.state = FlashcardsGenerating
	g.progress = components.NewProgressViewerModel("Generating flashcards with AI...", g.width, g.height)
}

func (g *GenerateFlashcardsModel) resetState() {
	g.state = FlashcardsSelectNode
	g.selectedNode = nil
	g.flashcards = nil
	g.nodesList = nil
	g.progress = nil
	g.errorMessage = ""
	g.isSearching = false
	g.searchInput.SetValue("")
	g.searchInput.Focus()
}

// Custom messages

type nodeSearchCompleteMsg struct {
	results []models.SearchResult
	err     string
}

type flashcardsGeneratedMsg struct {
	flashcards []models.Flashcard
	err        string
}
