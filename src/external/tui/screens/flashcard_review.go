package screens

import (
	"fmt"
	"strings"

	tea "github.com/charmbracelet/bubbletea"
	"kg-tui/components"
	"kg-tui/models"
	"kg-tui/utils"
)

// FlashcardReviewState represents the current state
type FlashcardReviewState int

const (
	ReviewShowCard FlashcardReviewState = iota
	ReviewConfirmSave
	ReviewComplete
)

// FlashcardReviewModel represents the flashcard review screen
type FlashcardReviewModel struct {
	state       FlashcardReviewState
	dataService *models.MockDataService
	width       int
	height      int

	// UI components
	saveConfirm *components.ConfirmationModel

	// State data
	flashcards    []models.Flashcard
	currentIndex  int
	selectedCards []models.Flashcard
	makePublic    bool
	errorMessage  string
}

// NewFlashcardReviewModel creates a new flashcard review model
func NewFlashcardReviewModel(flashcards []models.Flashcard, dataService *models.MockDataService) *FlashcardReviewModel {
	return &FlashcardReviewModel{
		state:         ReviewShowCard,
		dataService:   dataService,
		flashcards:    flashcards,
		currentIndex:  0,
		selectedCards: make([]models.Flashcard, 0),
		width:         80,
		height:        20,
	}
}

// Init implements tea.Model
func (f *FlashcardReviewModel) Init() tea.Cmd {
	return nil
}

// Update implements tea.Model
func (f *FlashcardReviewModel) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	var cmd tea.Cmd

	switch msg := msg.(type) {
	case tea.WindowSizeMsg:
		f.width = msg.Width
		f.height = msg.Height

	case tea.KeyMsg:
		switch msg.String() {
		case "q", "esc":
			return f.handleEscape()
		}
	}

	// Route to appropriate state handler
	switch f.state {
	case ReviewShowCard:
		return f.updateShowCard(msg)
	case ReviewConfirmSave:
		return f.updateConfirmSave(msg)
	case ReviewComplete:
		return f.updateComplete(msg)
	}

	return f, cmd
}

// View implements tea.Model
func (f *FlashcardReviewModel) View() string {
	header := utils.TitleStyle.Render("📚 Review Flashcards") + "\n\n"

	var content string
	switch f.state {
	case ReviewShowCard:
		content = f.viewShowCard()
	case ReviewConfirmSave:
		content = f.viewConfirmSave()
	case ReviewComplete:
		content = f.viewComplete()
	}

	if f.errorMessage != "" {
		content += "\n" + utils.ErrorStyle.Render("❌ "+f.errorMessage)
	}

	footer := "\n" + f.getFooterHelp()

	return header + content + footer
}

// State-specific update methods

func (f *FlashcardReviewModel) updateShowCard(msg tea.Msg) (tea.Model, tea.Cmd) {
	switch msg := msg.(type) {
	case tea.KeyMsg:
		switch msg.String() {
		case "k", "keep", "y":
			// Keep this card
			f.keepCurrentCard()
			return f.nextCard()
		case "d", "discard", "n":
			// Discard this card
			f.discardCurrentCard()
			return f.nextCard()
		case "left", "h", "p":
			// Previous card
			return f.prevCard()
		case "right", "l", "next":
			// Next card
			return f.nextCard()
		case "e", "edit":
			// TODO: Implement card editing
			return f, nil
		case "f", "finish":
			// Finish review
			return f.finishReview()
		}
	}

	return f, nil
}

func (f *FlashcardReviewModel) updateConfirmSave(msg tea.Msg) (tea.Model, tea.Cmd) {
	var cmd tea.Cmd

	f.saveConfirm, cmd = f.saveConfirm.Update(msg)

	if f.saveConfirm.IsConfirmed() {
		f.makePublic = true
		return f.saveSelectedCards()
	} else if f.saveConfirm.IsCancelled() {
		f.makePublic = false
		return f.saveSelectedCards()
	}

	return f, cmd
}

func (f *FlashcardReviewModel) updateComplete(msg tea.Msg) (tea.Model, tea.Cmd) {
	switch msg := msg.(type) {
	case tea.KeyMsg:
		switch msg.String() {
		case "enter", " ":
			return f, func() tea.Msg {
				return BackToMainMenuMsg{}
			}
		}
	}

	return f, nil
}

// State-specific view methods

func (f *FlashcardReviewModel) viewShowCard() string {
	var content strings.Builder

	if len(f.flashcards) == 0 {
		return utils.MutedStyle.Render("No flashcards to review.")
	}

	// Progress indicator
	progressText := fmt.Sprintf("Card %d of %d • Selected: %d", f.currentIndex+1, len(f.flashcards), len(f.selectedCards))
	content.WriteString(utils.SubtitleStyle.Render(progressText) + "\n\n")

	// Current card
	card := f.flashcards[f.currentIndex]
	cardDisplay := utils.FormatFlashcard(card.Front, card.Back, f.currentIndex+1, len(f.flashcards))
	content.WriteString(cardDisplay + "\n\n")

	// Action buttons
	content.WriteString(f.renderActionButtons())

	return content.String()
}

func (f *FlashcardReviewModel) viewConfirmSave() string {
	return f.saveConfirm.View()
}

func (f *FlashcardReviewModel) viewComplete() string {
	var content strings.Builder

	if len(f.selectedCards) > 0 {
		successMsg := fmt.Sprintf("✅ Successfully saved %d flashcards!", len(f.selectedCards))
		content.WriteString(utils.SuccessStyle.Render(successMsg) + "\n\n")

		visibility := "🔒 Private"
		if f.makePublic {
			visibility = "🌐 Public"
		}
		content.WriteString("Visibility: " + visibility + "\n\n")

		content.WriteString(utils.SubtitleStyle.Render("Summary:") + "\n")
		content.WriteString(fmt.Sprintf("• Total reviewed: %d cards\n", len(f.flashcards)))
		content.WriteString(fmt.Sprintf("• Selected: %d cards\n", len(f.selectedCards)))
		content.WriteString(fmt.Sprintf("• Discarded: %d cards\n\n", len(f.flashcards)-len(f.selectedCards)))
	} else {
		content.WriteString(utils.WarningStyle.Render("⚠️  No flashcards were saved") + "\n\n")
		content.WriteString(utils.MutedStyle.Render("You didn't select any cards to keep.") + "\n\n")
	}

	content.WriteString(utils.HelpStyle.Render("Press Enter or Space to continue"))

	return content.String()
}

// Helper methods

func (f *FlashcardReviewModel) renderActionButtons() string {
	var buttons []string

	// Keep button
	keepStyle := utils.ActiveItemStyle.Copy().
		Background(utils.ColorSuccess).
		Foreground(utils.ColorBorder).
		Padding(0, 1)
	buttons = append(buttons, keepStyle.Render("K Keep"))

	// Discard button
	discardStyle := utils.ActiveItemStyle.Copy().
		Background(utils.ColorError).
		Foreground(utils.ColorBorder).
		Padding(0, 1)
	buttons = append(buttons, discardStyle.Render("D Discard"))

	// Navigation buttons
	navStyle := utils.InactiveItemStyle.Copy().
		Background(utils.ColorSecondary).
		Foreground(utils.ColorBorder).
		Padding(0, 1)

	if f.currentIndex > 0 {
		buttons = append(buttons, navStyle.Render("← Previous"))
	}

	if f.currentIndex < len(f.flashcards)-1 {
		buttons = append(buttons, navStyle.Render("→ Next"))
	}

	// Finish button
	finishStyle := utils.ActiveItemStyle.Copy().
		Background(utils.ColorPrimary).
		Foreground(utils.ColorBorder).
		Padding(0, 1)
	buttons = append(buttons, finishStyle.Render("F Finish"))

	return strings.Join(buttons, "  ")
}

func (f *FlashcardReviewModel) handleEscape() (tea.Model, tea.Cmd) {
	switch f.state {
	case ReviewShowCard:
		// Ask for confirmation to abandon review
		return f, func() tea.Msg {
			return BackToMainMenuMsg{}
		}
	case ReviewConfirmSave, ReviewComplete:
		return f, func() tea.Msg {
			return BackToMainMenuMsg{}
		}
	}
	return f, nil
}

func (f *FlashcardReviewModel) getFooterHelp() string {
	switch f.state {
	case ReviewShowCard:
		return utils.HelpStyle.Render("K/Y: Keep • D/N: Discard • ←/→: Navigate • F: Finish • q: Quit")
	case ReviewConfirmSave:
		return utils.HelpStyle.Render("←/→: Choose • Enter: Confirm • q: Cancel")
	case ReviewComplete:
		return utils.HelpStyle.Render("Enter/Space: Continue • q: Main menu")
	}
	return ""
}

func (f *FlashcardReviewModel) keepCurrentCard() {
	if f.currentIndex >= 0 && f.currentIndex < len(f.flashcards) {
		card := f.flashcards[f.currentIndex]
		// Check if already selected
		for _, selected := range f.selectedCards {
			if selected.Front == card.Front && selected.Back == card.Back {
				return // Already selected
			}
		}
		f.selectedCards = append(f.selectedCards, card)
	}
}

func (f *FlashcardReviewModel) discardCurrentCard() {
	if f.currentIndex >= 0 && f.currentIndex < len(f.flashcards) {
		card := f.flashcards[f.currentIndex]
		// Remove from selected if present
		for i, selected := range f.selectedCards {
			if selected.Front == card.Front && selected.Back == card.Back {
				f.selectedCards = append(f.selectedCards[:i], f.selectedCards[i+1:]...)
				break
			}
		}
	}
}

func (f *FlashcardReviewModel) nextCard() (tea.Model, tea.Cmd) {
	if f.currentIndex < len(f.flashcards)-1 {
		f.currentIndex++
	} else {
		// Reached end, finish review
		return f.finishReview()
	}
	return f, nil
}

func (f *FlashcardReviewModel) prevCard() (tea.Model, tea.Cmd) {
	if f.currentIndex > 0 {
		f.currentIndex--
	}
	return f, nil
}

func (f *FlashcardReviewModel) finishReview() (tea.Model, tea.Cmd) {
	if len(f.selectedCards) == 0 {
		// No cards selected, go straight to complete
		f.state = ReviewComplete
		return f, nil
	}

	// Ask about public visibility
	message := fmt.Sprintf("Make all %d selected flashcards public?", len(f.selectedCards))
	f.saveConfirm = components.NewConfirmationModel(message, f.width, f.height)
	f.state = ReviewConfirmSave
	return f, nil
}

func (f *FlashcardReviewModel) saveSelectedCards() (tea.Model, tea.Cmd) {
	// In a real implementation, we would save each flashcard
	// For now, just simulate the save process

	if len(f.selectedCards) == 0 {
		f.state = ReviewComplete
		return f, nil
	}

	// Mock saving process
	for _, card := range f.selectedCards {
		req := models.CreateNodeRequest{
			Type: models.NodeTypeFlashcard,
			Data: map[string]interface{}{
				"front": card.Front,
				"back":  card.Back,
			},
			IsPublic: f.makePublic,
		}

		// Save via data service (in real app, handle errors)
		f.dataService.CreateNode(req)
	}

	f.state = ReviewComplete
	return f, nil
}
