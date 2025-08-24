package screens

import (
	"time"

	tea "github.com/charmbracelet/bubbletea"
	"kg-tui/components"
)

// LoadingModel represents a loading screen
type LoadingModel struct {
	progress *components.ProgressViewerModel
	width    int
	height   int
}

// NewLoadingModel creates a new loading screen
func NewLoadingModel(message string) *LoadingModel {
	progress := components.NewProgressViewerModel(message, 80, 20)

	return &LoadingModel{
		progress: progress,
		width:    80,
		height:   20,
	}
}

// Init implements tea.Model
func (l *LoadingModel) Init() tea.Cmd {
	return nil
}

// Update implements tea.Model
func (l *LoadingModel) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	var cmd tea.Cmd

	switch msg := msg.(type) {
	case tea.WindowSizeMsg:
		l.width = msg.Width
		l.height = msg.Height

	case tea.KeyMsg:
		// Loading screen typically doesn't respond to keys
		// but we can allow escape to cancel if needed
		if msg.String() == "esc" {
			return l, func() tea.Msg {
				return BackToMainMenuMsg{}
			}
		}
	}

	l.progress, cmd = l.progress.Update(msg)

	// Auto-animate the spinner
	if cmd == nil {
		cmd = tea.Tick(time.Millisecond*100, func(t time.Time) tea.Msg {
			return tea.KeyMsg{} // Dummy message to trigger re-render
		})
	}

	return l, cmd
}

// View implements tea.Model
func (l *LoadingModel) View() string {
	return l.progress.View()
}

// SetMessage updates the loading message
func (l *LoadingModel) SetMessage(message string) {
	l.progress.SetMessage(message)
}

// SetProgress updates the progress (0.0 to 1.0)
func (l *LoadingModel) SetProgress(progress float64) {
	l.progress.SetProgress(progress)
}
