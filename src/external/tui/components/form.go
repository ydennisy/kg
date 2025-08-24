package components

import (
	"strings"

	"github.com/charmbracelet/bubbles/textarea"
	"github.com/charmbracelet/bubbles/textinput"
	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"
	"kg-tui/utils"
)

// FormField represents a form field
type FormField struct {
	Label          string
	Value          string
	Placeholder    string
	Required       bool
	Multiline      bool
	ValidationType string
	Error          string
}

// FormModel manages a collection of form fields
type FormModel struct {
	fields    []*FormField
	inputs    []textinput.Model
	textareas []textarea.Model
	focused   int
	width     int
	height    int
	submitted bool
}

// NewFormModel creates a new form model
func NewFormModel(fields []*FormField, width, height int) *FormModel {
	inputs := make([]textinput.Model, 0)
	textareas := make([]textarea.Model, 0)

	for i, field := range fields {
		if field.Multiline {
			ta := textarea.New()
			ta.Placeholder = field.Placeholder
			ta.SetValue(field.Value)
			ta.SetWidth(width - 4)
			ta.SetHeight(6)
			ta.Focus()
			if i > 0 {
				ta.Blur()
			}
			textareas = append(textareas, ta)
		} else {
			ti := textinput.New()
			ti.Placeholder = field.Placeholder
			ti.SetValue(field.Value)
			ti.Width = width - 4
			ti.Focus()
			if i > 0 {
				ti.Blur()
			}
			inputs = append(inputs, ti)
		}
	}

	return &FormModel{
		fields:    fields,
		inputs:    inputs,
		textareas: textareas,
		focused:   0,
		width:     width,
		height:    height,
	}
}

// Update implements tea.Model
func (f *FormModel) Update(msg tea.Msg) (*FormModel, tea.Cmd) {
	var cmds []tea.Cmd

	switch msg := msg.(type) {
	case tea.WindowSizeMsg:
		f.width = msg.Width
		f.height = msg.Height

		// Update input widths
		for i := range f.inputs {
			f.inputs[i].Width = msg.Width - 4
		}
		for i := range f.textareas {
			f.textareas[i].SetWidth(msg.Width - 4)
		}

	case tea.KeyMsg:
		switch msg.String() {
		case "tab", "down":
			f.nextField()
			return f, nil
		case "shift+tab", "up":
			f.prevField()
			return f, nil
		case "enter":
			if f.currentFieldIsMultiline() {
				// Let textarea handle enter
				break
			} else {
				// Move to next field or submit if at the end
				if f.focused < len(f.fields)-1 {
					f.nextField()
					return f, nil
				} else {
					// Submit form
					if f.validate() {
						f.submitted = true
					}
					return f, nil
				}
			}
		}
	}

	// Update the focused field
	if f.focused < len(f.fields) {
		field := f.fields[f.focused]
		if field.Multiline {
			taIndex := f.getTextareaIndex(f.focused)
			if taIndex >= 0 && taIndex < len(f.textareas) {
				var cmd tea.Cmd
				f.textareas[taIndex], cmd = f.textareas[taIndex].Update(msg)
				f.fields[f.focused].Value = f.textareas[taIndex].Value()
				cmds = append(cmds, cmd)
			}
		} else {
			tiIndex := f.getInputIndex(f.focused)
			if tiIndex >= 0 && tiIndex < len(f.inputs) {
				var cmd tea.Cmd
				f.inputs[tiIndex], cmd = f.inputs[tiIndex].Update(msg)
				f.fields[f.focused].Value = f.inputs[tiIndex].Value()
				cmds = append(cmds, cmd)
			}
		}
	}

	return f, tea.Batch(cmds...)
}

// View implements tea.Model
func (f *FormModel) View() string {
	var b strings.Builder

	inputIndex := 0
	textareaIndex := 0

	for i, field := range f.fields {
		// Field label
		labelStyle := lipgloss.NewStyle().Bold(true)
		if i == f.focused {
			labelStyle = labelStyle.Copy().Foreground(utils.ColorPrimary)
		}

		label := field.Label
		if field.Required {
			label += " *"
		}
		b.WriteString(labelStyle.Render(label) + "\n")

		// Field input
		if field.Multiline {
			ta := f.textareas[textareaIndex]
			if i == f.focused {
				ta.Focus()
				ta.Prompt = ""
			} else {
				ta.Blur()
				ta.Prompt = "..."
			}
			b.WriteString(ta.View() + "\n")
			textareaIndex++
		} else {
			ti := f.inputs[inputIndex]
			if i == f.focused {
				ti.Focus()
				ti.Prompt = " > "
			} else {
				ti.Blur()
				ti.Prompt = "   "
			}
			b.WriteString(ti.View() + "\n")
			inputIndex++
		}

		// Field error
		if field.Error != "" {
			b.WriteString(utils.ErrorStyle.Render("  "+field.Error) + "\n")
		}

		b.WriteString("\n")
	}

	// Help text
	helpText := "Tab/↓: Next • Shift+Tab/↑: Previous • Enter: Submit"
	if f.currentFieldIsMultiline() {
		helpText = "Tab: Next field • Enter: New line • Shift+Tab: Previous"
	}
	b.WriteString(utils.HelpStyle.Render(helpText))

	return b.String()
}

// GetValues returns the current field values
func (f *FormModel) GetValues() map[string]string {
	values := make(map[string]string)
	for _, field := range f.fields {
		values[field.Label] = strings.TrimSpace(field.Value)
	}
	return values
}

// IsSubmitted returns true if the form was submitted
func (f *FormModel) IsSubmitted() bool {
	return f.submitted
}

// Reset resets the form submission state
func (f *FormModel) Reset() {
	f.submitted = false
}

// Validate validates all form fields
func (f *FormModel) validate() bool {
	allValid := true

	for _, field := range f.fields {
		field.Error = ""
		value := strings.TrimSpace(field.Value)

		if field.Required && value == "" {
			field.Error = "This field is required"
			allValid = false
			continue
		}

		if valid, errMsg := utils.ValidateInput(value, field.ValidationType); !valid {
			field.Error = errMsg
			allValid = false
		}
	}

	return allValid
}

// Helper methods

func (f *FormModel) nextField() {
	f.focused = (f.focused + 1) % len(f.fields)
}

func (f *FormModel) prevField() {
	f.focused = (f.focused - 1 + len(f.fields)) % len(f.fields)
}

func (f *FormModel) currentFieldIsMultiline() bool {
	if f.focused >= 0 && f.focused < len(f.fields) {
		return f.fields[f.focused].Multiline
	}
	return false
}

func (f *FormModel) getInputIndex(fieldIndex int) int {
	inputIndex := 0
	for i := 0; i < fieldIndex && i < len(f.fields); i++ {
		if !f.fields[i].Multiline {
			inputIndex++
		}
	}
	return inputIndex
}

func (f *FormModel) getTextareaIndex(fieldIndex int) int {
	textareaIndex := 0
	for i := 0; i < fieldIndex && i < len(f.fields); i++ {
		if f.fields[i].Multiline {
			textareaIndex++
		}
	}
	return textareaIndex
}

// ConfirmationModel provides a simple yes/no confirmation dialog
type ConfirmationModel struct {
	message     string
	yesSelected bool
	width       int
	height      int
	confirmed   bool
	cancelled   bool
}

// NewConfirmationModel creates a new confirmation dialog
func NewConfirmationModel(message string, width, height int) *ConfirmationModel {
	return &ConfirmationModel{
		message:     message,
		yesSelected: true,
		width:       width,
		height:      height,
	}
}

// Update implements tea.Model
func (c *ConfirmationModel) Update(msg tea.Msg) (*ConfirmationModel, tea.Cmd) {
	switch msg := msg.(type) {
	case tea.WindowSizeMsg:
		c.width = msg.Width
		c.height = msg.Height

	case tea.KeyMsg:
		switch msg.String() {
		case "left", "h":
			c.yesSelected = true
		case "right", "l":
			c.yesSelected = false
		case "tab":
			c.yesSelected = !c.yesSelected
		case "enter", " ":
			if c.yesSelected {
				c.confirmed = true
			} else {
				c.cancelled = true
			}
		case "y":
			c.confirmed = true
		case "n", "esc":
			c.cancelled = true
		}
	}

	return c, nil
}

// View implements tea.Model
func (c *ConfirmationModel) View() string {
	var b strings.Builder

	b.WriteString(lipgloss.NewStyle().Bold(true).Render(c.message) + "\n\n")

	// Render buttons
	yesStyle := utils.InputStyle.Copy()
	noStyle := utils.InputStyle.Copy()

	if c.yesSelected {
		yesStyle = utils.FocusedInputStyle.Copy()
	} else {
		noStyle = utils.FocusedInputStyle.Copy()
	}

	yesBtn := yesStyle.Render("Yes")
	noBtn := noStyle.Render("No")

	buttons := lipgloss.JoinHorizontal(lipgloss.Left, yesBtn, "  ", noBtn)
	b.WriteString(buttons + "\n\n")

	b.WriteString(utils.HelpStyle.Render("←/→: Select • Enter/Space: Confirm • Y: Yes • N: No"))

	return b.String()
}

// IsConfirmed returns true if user confirmed
func (c *ConfirmationModel) IsConfirmed() bool {
	return c.confirmed
}

// IsCancelled returns true if user cancelled
func (c *ConfirmationModel) IsCancelled() bool {
	return c.cancelled
}

// Reset resets the confirmation state
func (c *ConfirmationModel) Reset() {
	c.confirmed = false
	c.cancelled = false
}
