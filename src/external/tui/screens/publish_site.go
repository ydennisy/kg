package screens

import (
	"fmt"
	"strings"
	"time"

	tea "github.com/charmbracelet/bubbletea"
	"kg-tui/components"
	"kg-tui/models"
	"kg-tui/utils"
)

// PublishSiteState represents the current state
type PublishSiteState int

const (
	PublishConfirm PublishSiteState = iota
	PublishProgress
	PublishComplete
)

// PublishSiteModel represents the site publishing screen
type PublishSiteModel struct {
	state       PublishSiteState
	dataService *models.MockDataService
	width       int
	height      int

	// UI components
	confirmation *components.ConfirmationModel
	progress     *components.ProgressViewerModel

	// State data
	filesGenerated int
	outputDir      string
	errorMessage   string
}

// NewPublishSiteModel creates a new publish site model
func NewPublishSiteModel(dataService *models.MockDataService) *PublishSiteModel {
	confirmation := components.NewConfirmationModel(
		"Generate static HTML site from all public nodes?",
		80,
		20,
	)

	return &PublishSiteModel{
		state:        PublishConfirm,
		dataService:  dataService,
		confirmation: confirmation,
		width:        80,
		height:       20,
	}
}

// Init implements tea.Model
func (p *PublishSiteModel) Init() tea.Cmd {
	return nil
}

// Update implements tea.Model
func (p *PublishSiteModel) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	var cmd tea.Cmd

	switch msg := msg.(type) {
	case tea.WindowSizeMsg:
		p.width = msg.Width
		p.height = msg.Height

	case tea.KeyMsg:
		switch msg.String() {
		case "q", "esc":
			return p.handleEscape()
		}

	case publishCompleteMsg:
		p.handlePublishComplete(msg.filesGenerated, msg.outputDir, msg.err)
		return p, nil

	case publishProgressMsg:
		p.handleProgressUpdate(msg.message, msg.progress)
		return p, nil
	}

	// Route to appropriate state handler
	switch p.state {
	case PublishConfirm:
		return p.updateConfirm(msg)
	case PublishProgress:
		return p.updateProgress(msg)
	case PublishComplete:
		return p.updateComplete(msg)
	}

	return p, cmd
}

// View implements tea.Model
func (p *PublishSiteModel) View() string {
	header := utils.TitleStyle.Render("🌐 Publish Static Site") + "\n\n"

	var content string
	switch p.state {
	case PublishConfirm:
		content = p.viewConfirm()
	case PublishProgress:
		content = p.viewProgress()
	case PublishComplete:
		content = p.viewComplete()
	}

	if p.errorMessage != "" {
		content += "\n" + utils.ErrorStyle.Render("❌ "+p.errorMessage)
	}

	footer := "\n" + p.getFooterHelp()

	return header + content + footer
}

// State-specific update methods

func (p *PublishSiteModel) updateConfirm(msg tea.Msg) (tea.Model, tea.Cmd) {
	var cmd tea.Cmd

	p.confirmation, cmd = p.confirmation.Update(msg)

	if p.confirmation.IsConfirmed() {
		p.confirmation.Reset()
		return p.startPublishing()
	} else if p.confirmation.IsCancelled() {
		return p, func() tea.Msg {
			return BackToMainMenuMsg{}
		}
	}

	return p, cmd
}

func (p *PublishSiteModel) updateProgress(msg tea.Msg) (tea.Model, tea.Cmd) {
	var cmd tea.Cmd

	if p.progress != nil {
		p.progress, cmd = p.progress.Update(msg)
	}

	return p, cmd
}

func (p *PublishSiteModel) updateComplete(msg tea.Msg) (tea.Model, tea.Cmd) {
	switch msg := msg.(type) {
	case tea.KeyMsg:
		switch msg.String() {
		case "enter", " ":
			return p, func() tea.Msg {
				return BackToMainMenuMsg{}
			}
		case "p":
			// Publish again
			p.resetState()
			return p, nil
		}
	}

	return p, nil
}

// State-specific view methods

func (p *PublishSiteModel) viewConfirm() string {
	var content strings.Builder

	content.WriteString(utils.SubtitleStyle.Render("Static Site Generation") + "\n\n")

	content.WriteString("This will generate a static HTML website from all your public nodes.\n")
	content.WriteString("The site will be created in the './public' directory.\n\n")

	content.WriteString(utils.MutedStyle.Render("Features included:") + "\n")
	content.WriteString("• HTML pages for each public node\n")
	content.WriteString("• Navigation between linked nodes\n")
	content.WriteString("• CSS styling for consistent appearance\n")
	content.WriteString("• Index page with node listing\n\n")

	content.WriteString(p.confirmation.View())

	return content.String()
}

func (p *PublishSiteModel) viewProgress() string {
	var content strings.Builder

	content.WriteString(utils.SubtitleStyle.Render("Generating Static Site") + "\n\n")

	if p.progress != nil {
		content.WriteString(p.progress.View())
	} else {
		content.WriteString(utils.MutedStyle.Render("🌐 Preparing site generation...") + "\n")
	}

	return content.String()
}

func (p *PublishSiteModel) viewComplete() string {
	var content strings.Builder

	if p.filesGenerated > 0 {
		content.WriteString(utils.SuccessStyle.Render("✅ Site generated successfully!") + "\n\n")

		content.WriteString(utils.SubtitleStyle.Render("Generation Summary:") + "\n")
		content.WriteString("📁 Output directory: " + p.outputDir + "\n")
		content.WriteString(fmt.Sprintf("📄 Files generated: %d\n", p.filesGenerated))
		content.WriteString("🌐 Public nodes processed\n\n")

		content.WriteString(utils.SubtitleStyle.Render("Next Steps:") + "\n")
		content.WriteString("• Open " + p.outputDir + "/index.html in your browser\n")
		content.WriteString("• Deploy the contents to your web server\n")
		content.WriteString("• Use a static site host like Netlify or Vercel\n\n")

		content.WriteString(utils.SubtitleStyle.Render("Options:") + "\n")
		content.WriteString(utils.ActiveItemStyle.Render("p") + " Publish again\n")
		content.WriteString(utils.ActiveItemStyle.Render("Enter") + " Back to main menu\n")
	} else {
		content.WriteString(utils.WarningStyle.Render("⚠️  No files were generated") + "\n\n")
		content.WriteString(utils.MutedStyle.Render("This might happen if:") + "\n")
		content.WriteString("• No public nodes exist in your knowledge graph\n")
		content.WriteString("• All nodes are marked as private\n")
		content.WriteString("• There was an error during generation\n\n")

		content.WriteString(utils.SubtitleStyle.Render("Suggestions:") + "\n")
		content.WriteString("• Create some nodes and mark them as public\n")
		content.WriteString("• Try the publish process again\n\n")

		content.WriteString(utils.HelpStyle.Render("Press Enter to return to main menu"))
	}

	return content.String()
}

// Helper methods

func (p *PublishSiteModel) handleEscape() (tea.Model, tea.Cmd) {
	switch p.state {
	case PublishConfirm, PublishComplete:
		return p, func() tea.Msg {
			return BackToMainMenuMsg{}
		}
	case PublishProgress:
		// Cannot escape during publishing
		return p, nil
	}
	return p, nil
}

func (p *PublishSiteModel) getFooterHelp() string {
	switch p.state {
	case PublishConfirm:
		return utils.HelpStyle.Render("←/→: Choose • Enter: Confirm • Y: Yes • N: No • q: Cancel")
	case PublishProgress:
		return utils.HelpStyle.Render("Please wait while the site is being generated...")
	case PublishComplete:
		return utils.HelpStyle.Render("p: Publish again • Enter: Main menu")
	}
	return ""
}

func (p *PublishSiteModel) startPublishing() (tea.Model, tea.Cmd) {
	p.state = PublishProgress
	p.progress = components.NewProgressViewerModel("Generating static site...", p.width, p.height)

	return p, tea.Batch(
		p.publishSite(),
		p.sendProgressUpdates(),
	)
}

func (p *PublishSiteModel) publishSite() tea.Cmd {
	return func() tea.Msg {
		// Simulate publishing process
		response := p.dataService.PublishSite()

		return publishCompleteMsg{
			filesGenerated: response.Result.FilesGenerated,
			outputDir:      response.Result.OutputDir,
			err:            response.Error,
		}
	}
}

func (p *PublishSiteModel) sendProgressUpdates() tea.Cmd {
	return tea.Tick(time.Millisecond*500, func(t time.Time) tea.Msg {
		// Simulate progress updates
		messages := []string{
			"Scanning public nodes...",
			"Generating HTML templates...",
			"Processing node content...",
			"Creating navigation links...",
			"Writing CSS styles...",
			"Building index page...",
			"Finalizing output...",
		}

		// Simple progress simulation
		index := int(t.Unix()) % len(messages)
		progress := float64(index+1) / float64(len(messages))

		return publishProgressMsg{
			message:  messages[index],
			progress: progress,
		}
	})
}

func (p *PublishSiteModel) handlePublishComplete(filesGenerated int, outputDir, errMsg string) {
	if errMsg != "" {
		p.errorMessage = errMsg
		p.state = PublishConfirm // Return to confirmation
		return
	}

	p.filesGenerated = filesGenerated
	p.outputDir = outputDir
	p.errorMessage = ""
	p.state = PublishComplete
}

func (p *PublishSiteModel) handleProgressUpdate(message string, progress float64) {
	if p.progress != nil {
		p.progress.SetMessage(message)
		p.progress.SetProgress(progress)
	}
}

func (p *PublishSiteModel) resetState() {
	p.state = PublishConfirm
	p.confirmation = components.NewConfirmationModel(
		"Generate static HTML site from all public nodes?",
		p.width,
		p.height,
	)
	p.progress = nil
	p.filesGenerated = 0
	p.outputDir = ""
	p.errorMessage = ""
}

// Custom messages

type publishCompleteMsg struct {
	filesGenerated int
	outputDir      string
	err            string
}

type publishProgressMsg struct {
	message  string
	progress float64
}
