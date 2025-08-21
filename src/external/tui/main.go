package main

import (
	"fmt"
	"os"

	tea "github.com/charmbracelet/bubbletea"
	"kg-tui/models"
	"kg-tui/screens"
	"kg-tui/utils"
)

// AppState represents the current state of the application
type AppState int

const (
	StateMainMenu AppState = iota
	StateCreateNode
	StateSearchNodes
	StateGenerateFlashcards
	StatePublishSite
	StateNodeViewer
	StateFlashcardReview
	StateLoading
	StateError
)

// App represents the main application model
type App struct {
	state        AppState
	width        int
	height       int
	dataService  *models.MockDataService
	errorMessage string

	// Screen models
	mainMenu           *screens.MainMenuModel
	createNode         *screens.CreateNodeModel
	searchNodes        *screens.SearchNodesModel
	generateFlashcards *screens.GenerateFlashcardsModel
	publishSite        *screens.PublishSiteModel
	nodeViewer         *screens.NodeViewerModel
	flashcardReview    *screens.FlashcardReviewModel
	loadingScreen      *screens.LoadingModel
}

// NewApp creates a new application instance
func NewApp() *App {
	dataService := models.NewMockDataService()

	return &App{
		state:       StateMainMenu,
		dataService: dataService,
		mainMenu:    screens.NewMainMenuModel(),
	}
}

// Init implements tea.Model
func (a *App) Init() tea.Cmd {
	return tea.EnterAltScreen
}

// Update implements tea.Model
func (a *App) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	var cmd tea.Cmd

	switch msg := msg.(type) {
	case tea.WindowSizeMsg:
		a.width = msg.Width
		a.height = msg.Height
		return a, nil

	case tea.KeyMsg:
		switch msg.String() {
		case "ctrl+c", "q":
			if a.state == StateMainMenu {
				return a, tea.Quit
			}
			// Return to main menu from other states
			a.state = StateMainMenu
			if a.mainMenu == nil {
				a.mainMenu = screens.NewMainMenuModel()
			}
			return a, nil
		}

	case screens.NavigateToCreateNodeMsg:
		a.state = StateCreateNode
		a.createNode = screens.NewCreateNodeModel(a.dataService, a.width, a.height)
		return a, nil

	case screens.NavigateToSearchMsg:
		a.state = StateSearchNodes
		a.searchNodes = screens.NewSearchNodesModel(a.dataService, a.width, a.height)
		return a, nil

	case screens.NavigateToFlashcardsMsg:
		a.state = StateGenerateFlashcards
		a.generateFlashcards = screens.NewGenerateFlashcardsModel(a.dataService)
		return a, nil

	case screens.NavigateToPublishMsg:
		a.state = StatePublishSite
		a.publishSite = screens.NewPublishSiteModel(a.dataService)
		return a, nil

	case screens.ViewNodeMsg:
		a.state = StateNodeViewer
		a.nodeViewer = screens.NewNodeViewerModel(msg.Node)
		return a, nil

	case screens.ReviewFlashcardsMsg:
		a.state = StateFlashcardReview
		a.flashcardReview = screens.NewFlashcardReviewModel(msg.Flashcards, a.dataService)
		return a, nil

	case screens.ShowLoadingMsg:
		a.state = StateLoading
		a.loadingScreen = screens.NewLoadingModel(msg.Message)
		return a, nil

	case screens.ShowErrorMsg:
		a.state = StateError
		a.errorMessage = msg.Error
		return a, nil

	case screens.BackToMainMenuMsg:
		a.state = StateMainMenu
		if a.mainMenu == nil {
			a.mainMenu = screens.NewMainMenuModel()
		}
		return a, nil
	}

	// Route updates to the appropriate screen
	switch a.state {
	case StateMainMenu:
		if a.mainMenu != nil {
			model, cmd := a.mainMenu.Update(msg)
			a.mainMenu = model.(*screens.MainMenuModel)
			return a, cmd
		}

	case StateCreateNode:
		if a.createNode != nil {
			model, cmd := a.createNode.Update(msg)
			a.createNode = model.(*screens.CreateNodeModel)
			return a, cmd
		}

	case StateSearchNodes:
		if a.searchNodes != nil {
			model, cmd := a.searchNodes.Update(msg)
			a.searchNodes = model.(*screens.SearchNodesModel)
			return a, cmd
		}

	case StateGenerateFlashcards:
		if a.generateFlashcards != nil {
			model, cmd := a.generateFlashcards.Update(msg)
			a.generateFlashcards = model.(*screens.GenerateFlashcardsModel)
			return a, cmd
		}

	case StatePublishSite:
		if a.publishSite != nil {
			model, cmd := a.publishSite.Update(msg)
			a.publishSite = model.(*screens.PublishSiteModel)
			return a, cmd
		}

	case StateNodeViewer:
		if a.nodeViewer != nil {
			model, cmd := a.nodeViewer.Update(msg)
			a.nodeViewer = model.(*screens.NodeViewerModel)
			return a, cmd
		}

	case StateFlashcardReview:
		if a.flashcardReview != nil {
			model, cmd := a.flashcardReview.Update(msg)
			a.flashcardReview = model.(*screens.FlashcardReviewModel)
			return a, cmd
		}

	case StateLoading:
		if a.loadingScreen != nil {
			model, cmd := a.loadingScreen.Update(msg)
			a.loadingScreen = model.(*screens.LoadingModel)
			return a, cmd
		}
	}

	return a, cmd
}

// View implements tea.Model
func (a *App) View() string {
	if a.width == 0 || a.height == 0 {
		return "Loading..."
	}

	header := utils.TitleStyle.Render("🔗 Knowledge Graph TUI") + "\n"
	footer := utils.HelpStyle.Render("Press 'q' to quit • Press 'ctrl+c' to exit")

	var content string

	switch a.state {
	case StateMainMenu:
		if a.mainMenu != nil {
			content = a.mainMenu.View()
		}

	case StateCreateNode:
		if a.createNode != nil {
			content = a.createNode.View()
		}

	case StateSearchNodes:
		if a.searchNodes != nil {
			content = a.searchNodes.View()
		}

	case StateGenerateFlashcards:
		if a.generateFlashcards != nil {
			content = a.generateFlashcards.View()
		}

	case StatePublishSite:
		if a.publishSite != nil {
			content = a.publishSite.View()
		}

	case StateNodeViewer:
		if a.nodeViewer != nil {
			content = a.nodeViewer.View()
		}

	case StateFlashcardReview:
		if a.flashcardReview != nil {
			content = a.flashcardReview.View()
		}

	case StateLoading:
		if a.loadingScreen != nil {
			content = a.loadingScreen.View()
		}

	case StateError:
		content = utils.ErrorStyle.Render("❌ Error: "+a.errorMessage) + "\n\n" +
			utils.HelpStyle.Render("Press any key to return to main menu")

	default:
		content = "Unknown state"
	}

	// Calculate available space for content
	availableHeight := a.height - 4 // Account for header, footer, and padding
	if availableHeight < 10 {
		availableHeight = 10
	}

	// Ensure content fits within available space
	contentLines := len([]rune(content))
	if contentLines > availableHeight {
		// Truncate content if it's too long
		lines := utils.WrapText(content, a.width)
		if len(lines) > availableHeight {
			lines = lines[:availableHeight-1]
			lines = append(lines, "... (content truncated)")
		}
		content = ""
		for _, line := range lines {
			content += line + "\n"
		}
	}

	return header + "\n" + content + "\n" + footer
}

func main() {
	app := NewApp()

	p := tea.NewProgram(app, tea.WithAltScreen())

	if _, err := p.Run(); err != nil {
		fmt.Printf("Error running application: %v", err)
		os.Exit(1)
	}
}
