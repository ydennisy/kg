package utils

import (
	"fmt"

	"github.com/charmbracelet/lipgloss"
)

// Define consistent colors
var (
	// A more modern and softer color palette
	ColorPrimary   = lipgloss.Color("#FF6B6B") // Coral
	ColorSecondary = lipgloss.Color("#4D96FF") // Blue
	ColorSuccess   = lipgloss.Color("#4CAF50") // Green
	ColorWarning   = lipgloss.Color("#FFC107") // Amber
	ColorError     = lipgloss.Color("#F44336") // Red
	ColorMuted     = lipgloss.Color("#9E9E9E") // Grey
	ColorBorder    = lipgloss.Color("#E0E0E0") // Light Grey
	ColorBlack     = lipgloss.Color("#000000")
	ColorWhite     = lipgloss.Color("#FFFFFF")
)

// Base styles
var (
	// Title style for headers
	TitleStyle = lipgloss.NewStyle().
			Foreground(ColorPrimary).
			Bold(true).
			MarginBottom(1)

	// Subtitle style
	SubtitleStyle = lipgloss.NewStyle().
			Foreground(ColorSecondary).
			Bold(true)

	// Error style
	ErrorStyle = lipgloss.NewStyle().
			Foreground(ColorError).
			Bold(true)

	// Success style
	SuccessStyle = lipgloss.NewStyle().
			Foreground(ColorSuccess).
			Bold(true)

	// Warning style
	WarningStyle = lipgloss.NewStyle().
			Foreground(ColorWarning).
			Bold(true)

	// Muted style for secondary text
	MutedStyle = lipgloss.NewStyle().
			Foreground(ColorMuted)

	// Help text style
	HelpStyle = lipgloss.NewStyle().
			Foreground(ColorMuted).
			MarginTop(1)

	// Border style for containers
	BorderStyle = lipgloss.NewStyle().
			Border(lipgloss.RoundedBorder()).
			BorderForeground(ColorBorder).
			Padding(1, 2)

	// Active item style
	ActiveItemStyle = lipgloss.NewStyle().
			Foreground(ColorPrimary).
			Bold(true)

	// Inactive item style
	InactiveItemStyle = lipgloss.NewStyle().
				Foreground(ColorMuted)

	// Input field style
	InputStyle = lipgloss.NewStyle().
			Border(lipgloss.NormalBorder()).
			BorderForeground(ColorBorder).
			Padding(0, 1)

	// Focused input style
	FocusedInputStyle = lipgloss.NewStyle().
				Border(lipgloss.NormalBorder()).
				BorderForeground(ColorPrimary).
				Padding(0, 1)

	// Content area style
	ContentStyle = lipgloss.NewStyle().
			Border(lipgloss.RoundedBorder()).
			BorderForeground(ColorBorder).
			Padding(1).
			MarginTop(1)
)

// FormatNodeType formats a node type with appropriate styling
func FormatNodeType(nodeType string) string {
	var color lipgloss.Color
	switch nodeType {
	case "note":
		color = lipgloss.Color("#2196F3") // Blue
	case "link":
		color = lipgloss.Color("#FF9800") // Orange
	case "tag":
		color = lipgloss.Color("#E91E63") // Pink
	case "flashcard":
		color = lipgloss.Color("#4CAF50") // Green
	default:
		color = ColorMuted
	}

	return lipgloss.NewStyle().
		Foreground(color).
		Bold(true).
		Render(" [" + nodeType + "]")
}

// FormatScore formats a search score with appropriate color
func FormatScore(score float64) string {
	var color lipgloss.Color
	if score >= 0.8 {
		color = ColorSuccess
	} else if score >= 0.5 {
		color = ColorWarning
	} else {
		color = ColorError
	}

	scoreText := fmt.Sprintf("(%.2f)", score)
	return lipgloss.NewStyle().
		Foreground(color).
		Render(scoreText)
}

// Progress bar style
func ProgressStyle(width int) lipgloss.Style {
	return lipgloss.NewStyle().
		Width(width).
		Border(lipgloss.RoundedBorder()).
		BorderForeground(ColorBorder)
}

// Status message styles
func StatusMessage(message string, msgType string) string {
	var style lipgloss.Style
	switch msgType {
	case "success":
		style = SuccessStyle.Copy().PaddingLeft(1)
	case "error":
		style = ErrorStyle.Copy().PaddingLeft(1)
	case "warning":
		style = WarningStyle.Copy().PaddingLeft(1)
	default:
		style = MutedStyle.Copy().PaddingLeft(1)
	}
	return style.Render(message)
}

// Format flashcard for display
func FormatFlashcard(front, back string, index, total int) string {
	headerText := fmt.Sprintf("Card %d of %d", index, total)
	header := TitleStyle.Render(headerText)

	frontSection := lipgloss.NewStyle().
		Foreground(ColorSecondary).
		Bold(true).
		MarginTop(1).
		Render("🎯 FRONT:")

	frontContent := ContentStyle.Render(front)

	backSection := lipgloss.NewStyle().
		Foreground(ColorPrimary).
		Bold(true).
		MarginTop(1).
		Render("💡 BACK:")

	backContent := ContentStyle.Render(back)

	return lipgloss.JoinVertical(lipgloss.Left,
		header,
		"─────────────────────────────────────────────────",
		frontSection,
		frontContent,
		backSection,
		backContent,
	)
}