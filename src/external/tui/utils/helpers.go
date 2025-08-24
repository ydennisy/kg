package utils

import (
	"strings"
	"unicode/utf8"
)

// TruncateString truncates a string to a maximum length with ellipsis
func TruncateString(s string, maxLen int) string {
	if utf8.RuneCountInString(s) <= maxLen {
		return s
	}

	runes := []rune(s)
	if len(runes) <= maxLen-3 {
		return string(runes) + "..."
	}

	return string(runes[:maxLen-3]) + "..."
}

// RemoveHTMLTags removes simple HTML tags from a string
func RemoveHTMLTags(s string) string {
	s = strings.ReplaceAll(s, "<b>", "")
	s = strings.ReplaceAll(s, "</b>", "")
	s = strings.ReplaceAll(s, "<i>", "")
	s = strings.ReplaceAll(s, "</i>", "")
	return s
}

// HighlightText adds ANSI color codes to highlight text
func HighlightText(text, query string) string {
	if query == "" {
		return text
	}

	// Case-insensitive replacement
	lowerText := strings.ToLower(text)
	lowerQuery := strings.ToLower(query)

	if !strings.Contains(lowerText, lowerQuery) {
		return text
	}

	// Find the actual case-sensitive match
	index := strings.Index(lowerText, lowerQuery)
	if index == -1 {
		return text
	}

	// Extract the actual match with original case
	actualMatch := text[index : index+len(query)]

	// Replace with highlighted version
	highlighted := "\033[1;35m" + actualMatch + "\033[0m" // Bold magenta
	return strings.Replace(text, actualMatch, highlighted, 1)
}

// WrapText wraps text to fit within a specified width
func WrapText(text string, width int) []string {
	if width <= 0 {
		return []string{text}
	}

	words := strings.Fields(text)
	if len(words) == 0 {
		return []string{""}
	}

	var lines []string
	currentLine := ""

	for _, word := range words {
		// If adding this word would exceed the width
		if len(currentLine)+len(word)+1 > width {
			if currentLine != "" {
				lines = append(lines, currentLine)
				currentLine = word
			} else {
				// Word is longer than width, truncate it
				lines = append(lines, TruncateString(word, width))
				currentLine = ""
			}
		} else {
			if currentLine == "" {
				currentLine = word
			} else {
				currentLine += " " + word
			}
		}
	}

	if currentLine != "" {
		lines = append(lines, currentLine)
	}

	return lines
}

// PadRight pads a string to the right with spaces
func PadRight(s string, length int) string {
	if len(s) >= length {
		return s
	}
	return s + strings.Repeat(" ", length-len(s))
}

// PadLeft pads a string to the left with spaces
func PadLeft(s string, length int) string {
	if len(s) >= length {
		return s
	}
	return strings.Repeat(" ", length-len(s)) + s
}

// Center centers a string within a given width
func Center(s string, width int) string {
	if len(s) >= width {
		return s
	}

	padding := width - len(s)
	leftPad := padding / 2
	rightPad := padding - leftPad

	return strings.Repeat(" ", leftPad) + s + strings.Repeat(" ", rightPad)
}

// ValidateInput validates input based on type
func ValidateInput(input string, inputType string) (bool, string) {
	input = strings.TrimSpace(input)

	switch inputType {
	case "required":
		if input == "" {
			return false, "This field is required"
		}
	case "url":
		if input == "" {
			return false, "URL is required"
		}
		if !strings.HasPrefix(input, "http://") && !strings.HasPrefix(input, "https://") {
			return false, "URL must start with http:// or https://"
		}
	case "title":
		if len(input) > 200 {
			return false, "Title must be less than 200 characters"
		}
	case "content":
		if len(input) > 10000 {
			return false, "Content must be less than 10,000 characters"
		}
	}

	return true, ""
}

// FormatDuration formats a duration in a human-readable way (currently unused, kept for future use)
func FormatDuration(seconds int) string {
	if seconds < 60 {
		return "less than a minute"
	} else if seconds < 3600 {
		minutes := seconds / 60
		if minutes == 1 {
			return "1 minute"
		}
		return "several minutes"
	}

	hours := seconds / 3600
	if hours == 1 {
		return "about 1 hour"
	}
	return "several hours"
}
