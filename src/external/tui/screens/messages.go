package screens

import "kg-tui/models"

// Navigation messages for communication between screens and main app

// NavigateToCreateNodeMsg triggers navigation to create node screen
type NavigateToCreateNodeMsg struct{}

// NavigateToSearchMsg triggers navigation to search screen
type NavigateToSearchMsg struct{}

// NavigateToFlashcardsMsg triggers navigation to flashcard generation screen
type NavigateToFlashcardsMsg struct{}

// NavigateToPublishMsg triggers navigation to publish site screen
type NavigateToPublishMsg struct{}

// ViewNodeMsg triggers navigation to node viewer with specific node
type ViewNodeMsg struct {
	Node models.Node
}

// ReviewFlashcardsMsg triggers navigation to flashcard review with flashcards
type ReviewFlashcardsMsg struct {
	Flashcards []models.Flashcard
}

// ShowLoadingMsg triggers navigation to loading screen
type ShowLoadingMsg struct {
	Message string
}

// ShowErrorMsg triggers navigation to error display
type ShowErrorMsg struct {
	Error string
}

// BackToMainMenuMsg triggers navigation back to main menu
type BackToMainMenuMsg struct{}

// NodeCreatedMsg indicates a node was successfully created
type NodeCreatedMsg struct {
	Node models.Node
}

// SearchCompletedMsg indicates search has completed
type SearchCompletedMsg struct {
	Results []models.SearchResult
}

// FlashcardsGeneratedMsg indicates flashcards were generated
type FlashcardsGeneratedMsg struct {
	Flashcards []models.Flashcard
}

// PublishCompletedMsg indicates site publishing completed
type PublishCompletedMsg struct {
	FilesGenerated int
	OutputDir      string
}

// FlashcardsSelectedMsg indicates user has selected flashcards to save
type FlashcardsSelectedMsg struct {
	SelectedCards []models.Flashcard
	MakePublic    bool
}
