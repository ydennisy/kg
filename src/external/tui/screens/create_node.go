package screens

import (
	"strings"

	"github.com/charmbracelet/bubbles/list"
	"github.com/charmbracelet/lipgloss"
	tea "github.com/charmbracelet/bubbletea"
	"kg-tui/components"
	"kg-tui/models"
	"kg-tui/utils"
)

// CreateNodeState represents the current state of node creation
type CreateNodeState int

const (
	CreateNodeSelectType CreateNodeState = iota
	CreateNodeInputData
	CreateNodeConfirmPublic
	CreateNodeLinking
	CreateNodeComplete
)

// CreateNodeModel represents the node creation screen
type CreateNodeModel struct {
	state       CreateNodeState
	dataService *models.MockDataService
	width       int
	height      int

	// UI components
	typeList    *components.MenuListModel
	form        *components.FormModel
	publicConfirm *components.ConfirmationModel

	// State data
	selectedType models.NodeType
	formValues   map[string]string
	isPublic     bool
	createdNode  *models.Node
	errorMessage string
}

// NewCreateNodeModel creates a new node creation model
func NewCreateNodeModel(dataService *models.MockDataService, width, height int) *CreateNodeModel {
	// Create node type selection list
	typeItems := []list.Item{
		components.NewListItem("Note", "A text-based knowledge entry", models.NodeTypeNote),
		components.NewListItem("Link", "A URL reference", models.NodeTypeLink),
		components.NewListItem("Tag", "A category label", models.NodeTypeTag),
		components.NewListItem("Flashcard", "A study card", models.NodeTypeFlashcard),
	}

	typeList := components.NewMenuListModel("Select Node Type", typeItems, width, height)

	return &CreateNodeModel{
		state:       CreateNodeSelectType,
		dataService: dataService,
		typeList:    typeList,
		width:       width,
		height:      height,
	}
}

// Init implements tea.Model
func (c *CreateNodeModel) Init() tea.Cmd {
	return nil
}

// Update implements tea.Model
func (c *CreateNodeModel) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	var cmd tea.Cmd

	switch msg := msg.(type) {
	case tea.WindowSizeMsg:
		c.width = msg.Width
		c.height = msg.Height

	case tea.KeyMsg:
		switch msg.String() {
		case "q", "esc":
			if c.state == CreateNodeSelectType {
				return c, func() tea.Msg {
					return BackToMainMenuMsg{}
				}
			} else {
				// Go back to previous state
				c.goToPreviousState()
				return c, nil
			}
		}
	}

	// Route to appropriate state handler
	switch c.state {
	case CreateNodeSelectType:
		return c.updateTypeSelection(msg)
	case CreateNodeInputData:
		return c.updateDataInput(msg)
	case CreateNodeConfirmPublic:
		return c.updatePublicConfirm(msg)
	case CreateNodeComplete:
		return c.updateComplete(msg)
	}

	return c, cmd
}

// View implements tea.Model
func (c *CreateNodeModel) View() string {
	var content string

	switch c.state {
	case CreateNodeSelectType:
		content = c.typeList.View()
	case CreateNodeInputData:
		content = c.form.View()
	case CreateNodeConfirmPublic:
		content = c.publicConfirm.View()
	case CreateNodeComplete:
		content = c.viewComplete()
	}

	if c.errorMessage != "" {
		content += "\n" + utils.ErrorStyle.Render("❌ "+c.errorMessage)
	}

	return lipgloss.JoinVertical(lipgloss.Left,
		utils.TitleStyle.Render("📝 Create New Node"),
		c.getBreadcrumb(),
		content,
		utils.HelpStyle.Render("Press 'q' to go back • 'esc' to cancel"),
	)
}

// State-specific update methods

func (c *CreateNodeModel) updateTypeSelection(msg tea.Msg) (tea.Model, tea.Cmd) {
	var cmd tea.Cmd

	switch msg := msg.(type) {
	case tea.KeyMsg:
		switch msg.String() {
		case "enter":
			c.selectedType = c.typeList.SelectedItem().Value().(models.NodeType)
			c.createForm()
			c.state = CreateNodeInputData
			return c, nil
		}
	}

	c.typeList, cmd = c.typeList.Update(msg)
	return c, cmd
}

func (c *CreateNodeModel) updateDataInput(msg tea.Msg) (tea.Model, tea.Cmd) {
	var cmd tea.Cmd

	c.form, cmd = c.form.Update(msg)

	if c.form.IsSubmitted() {
		c.formValues = c.form.GetValues()
		c.form.Reset()
		c.createPublicConfirm()
		c.state = CreateNodeConfirmPublic
	}

	return c, cmd
}

func (c *CreateNodeModel) updatePublicConfirm(msg tea.Msg) (tea.Model, tea.Cmd) {
	var cmd tea.Cmd

	c.publicConfirm, cmd = c.publicConfirm.Update(msg)

	if c.publicConfirm.IsConfirmed() || c.publicConfirm.IsCancelled() {
		c.isPublic = c.publicConfirm.IsConfirmed()
		c.publicConfirm.Reset()

		// Create the node
		return c.createNode()
	}

	return c, cmd
}

func (c *CreateNodeModel) updateComplete(msg tea.Msg) (tea.Model, tea.Cmd) {
	switch msg := msg.(type) {
	case tea.KeyMsg:
		switch msg.String() {
		case "enter", " ":
			return c, func() tea.Msg {
				return BackToMainMenuMsg{}
			}
		}
	}

	return c, nil
}

// State-specific view methods



func (c *CreateNodeModel) viewPublicConfirm() string {
	return c.publicConfirm.View()
}

func (c *CreateNodeModel) viewComplete() string {
	var content strings.Builder

	if c.createdNode != nil {
		content.WriteString(utils.SuccessStyle.Render("✅ Node created successfully!") + "\n\n")
		content.WriteString(utils.SubtitleStyle.Render("Node Details:") + "\n")
		content.WriteString("ID: " + c.createdNode.ID + "\n")
		content.WriteString("Type: " + utils.FormatNodeType(string(c.createdNode.Type)) + "\n")
		content.WriteString("Title: " + c.createdNode.Title + "\n")

		visibility := "🔒 Private"
		if c.createdNode.IsPublic {
			visibility = "🌐 Public"
		}
		content.WriteString("Visibility: " + visibility + "\n\n")

		content.WriteString(utils.HelpStyle.Render("Press Enter or Space to continue"))
	} else {
		content.WriteString(utils.ErrorStyle.Render("❌ Failed to create node") + "\n\n")
		content.WriteString(utils.HelpStyle.Render("Press Enter to return to main menu"))
	}

	return content.String()
}

// Helper methods

func (c *CreateNodeModel) getBreadcrumb() string {
	steps := []string{"Create Node"}

	switch c.state {
	case CreateNodeSelectType:
		steps = append(steps, "Select Type")
	case CreateNodeInputData:
		steps = append(steps, "Select Type", "Enter Data")
	case CreateNodeConfirmPublic:
		steps = append(steps, "Select Type", "Enter Data", "Visibility")
	case CreateNodeComplete:
		steps = append(steps, "Complete")
	}

	breadcrumb := components.NewBreadcrumbModel(steps, c.width, 2)
	return breadcrumb.View()
}

func (c *CreateNodeModel) goToPreviousState() {
	switch c.state {
	case CreateNodeInputData:
		c.state = CreateNodeSelectType
	case CreateNodeConfirmPublic:
		c.state = CreateNodeInputData
	case CreateNodeComplete:
		c.state = CreateNodeSelectType
		c.resetState()
	}
}

func (c *CreateNodeModel) resetState() {
	c.selectedType = ""
	c.formValues = nil
	c.isPublic = false
	c.createdNode = nil
	c.errorMessage = ""
}

func (c *CreateNodeModel) createForm() {
	var fields []*components.FormField

	switch c.selectedType {
	case models.NodeTypeNote:
		fields = []*components.FormField{
			{
				Label:          "Title",
				Placeholder:    "Enter note title...",
				Required:       true,
				ValidationType: "required",
			},
			{
				Label:          "Content",
				Placeholder:    "Enter note content...",
				Required:       true,
				Multiline:      true,
				ValidationType: "required",
			},
		}

	case models.NodeTypeLink:
		fields = []*components.FormField{
			{
				Label:          "URL",
				Placeholder:    "https://example.com",
				Required:       true,
				ValidationType: "url",
			},
			{
				Label:       "Title (optional)",
				Placeholder: "Leave blank to use crawled title",
			},
		}

	case models.NodeTypeTag:
		fields = []*components.FormField{
			{
				Label:          "Name",
				Placeholder:    "tag-name",
				Required:       true,
				ValidationType: "required",
			},
		}

	case models.NodeTypeFlashcard:
		fields = []*components.FormField{
			{
				Label:          "Front",
				Placeholder:    "Question or prompt...",
				Required:       true,
				ValidationType: "required",
			},
			{
				Label:          "Back",
				Placeholder:    "Answer or explanation...",
				Required:       true,
				ValidationType: "required",
			},
		}
	}

	c.form = components.NewFormModel(fields, c.width, c.height)
}

func (c *CreateNodeModel) createPublicConfirm() {
	message := "Make this node public?"
	c.publicConfirm = components.NewConfirmationModel(message, c.width, c.height)
}

func (c *CreateNodeModel) createNode() (tea.Model, tea.Cmd) {
	// Build the request data
	data := make(map[string]interface{})
	title := ""

	switch c.selectedType {
	case models.NodeTypeNote:
		title = c.formValues["Title"]
		data["content"] = c.formValues["Content"]

	case models.NodeTypeLink:
		data["url"] = c.formValues["URL"]
		if titleVal := c.formValues["Title (optional)"]; titleVal != "" {
			title = titleVal
		}

	case models.NodeTypeTag:
		data["name"] = c.formValues["Name"]

	case models.NodeTypeFlashcard:
		data["front"] = c.formValues["Front"]
		data["back"] = c.formValues["Back"]
	}

	// Create the node request
	req := models.CreateNodeRequest{
		Type:     c.selectedType,
		Title:    title,
		Data:     data,
		IsPublic: c.isPublic,
	}

	// Call mock service
	response := c.dataService.CreateNode(req)

	if response.OK {
		c.createdNode = response.Result
		c.errorMessage = ""
	} else {
		c.errorMessage = response.Error
	}

	c.state = CreateNodeComplete
	return c, nil
}
