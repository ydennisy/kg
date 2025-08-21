package components

import (
	"fmt"

	"github.com/charmbracelet/bubbles/list"
	tea "github.com/charmbracelet/bubbletea"
	"kg-tui/models"
	"kg-tui/utils"
)

// ListItem represents an item in a list
type ListItem struct {
	title       string
	description string
	value       any
}

// Title implements list.Item
func (i ListItem) Title() string { return i.title }

// Description implements list.Item
func (i ListItem) Description() string { return i.description }

// Value returns the associated value
func (i ListItem) Value() any { return i.value }

// FilterValue implements list.Item
func (i ListItem) FilterValue() string { return i.title }

// NewListItem creates a new list item
func NewListItem(title, description string, value any) ListItem {
	return ListItem{
		title:       title,
		description: description,
		value:       value,
	}
}

// MenuListModel wraps bubbles list for menu navigation
type MenuListModel struct {
	list   list.Model
	title  string
	width  int
	height int
}

// NewMenuListModel creates a new menu list model
func NewMenuListModel(title string, items []list.Item, width, height int) *MenuListModel {
	// Create list with custom styles
	delegate := list.NewDefaultDelegate()
	delegate.Styles.SelectedTitle = utils.ActiveItemStyle
	delegate.Styles.SelectedDesc = utils.ActiveItemStyle.Copy().Foreground(utils.ColorMuted)
	delegate.Styles.NormalTitle = utils.InactiveItemStyle
	delegate.Styles.NormalDesc = utils.InactiveItemStyle.Copy().Foreground(utils.ColorMuted)

	l := list.New(items, delegate, width, height-4)
	l.Title = title
	l.Styles.Title = utils.TitleStyle
	l.SetShowHelp(false)
	l.SetShowStatusBar(false)
	l.SetShowPagination(true)
	l.SetFilteringEnabled(true)

	return &MenuListModel{
		list:   l,
		title:  title,
		width:  width,
		height: height,
	}
}

// Update implements tea.Model
func (m *MenuListModel) Update(msg tea.Msg) (*MenuListModel, tea.Cmd) {
	var cmd tea.Cmd

	switch msg := msg.(type) {
	case tea.WindowSizeMsg:
		m.width = msg.Width
		m.height = msg.Height
		m.list.SetSize(msg.Width, msg.Height-4)
	}

	m.list, cmd = m.list.Update(msg)
	return m, cmd
}

// View implements tea.Model
func (m *MenuListModel) View() string {
	return m.list.View()
}

// SelectedItem returns the currently selected item
func (m *MenuListModel) SelectedItem() ListItem {
	if item := m.list.SelectedItem(); item != nil {
		return item.(ListItem)
	}
	return ListItem{}
}

// SetItems updates the list items
func (m *MenuListModel) SetItems(items []list.Item) {
	m.list.SetItems(items)
}

// SearchResultsListModel specialized list for search results
type SearchResultsListModel struct {
	list    list.Model
	results []models.SearchResult
	width   int
	height  int
}

// NewSearchResultsListModel creates a search results list
func NewSearchResultsListModel(results []models.SearchResult, width, height int) *SearchResultsListModel {
	items := make([]list.Item, len(results))

	for i, result := range results {
		// Format the title with node type and score
		title := fmt.Sprintf("%s %s %s",
			utils.FormatNodeType(string(result.Node.Type)),
			result.Node.Title,
			utils.FormatScore(result.Score),
		)

		// Clean up the snippet
		description := utils.RemoveHTMLTags(result.Snippet)
		if len(description) > 100 {
			description = utils.TruncateString(description, 100)
		}

		items[i] = NewListItem(title, description, result.Node)
	}

	delegate := list.NewDefaultDelegate()
	delegate.Styles.SelectedTitle = utils.ActiveItemStyle
	delegate.Styles.SelectedDesc = utils.ActiveItemStyle.Copy().Foreground(utils.ColorMuted)
	delegate.Styles.NormalTitle = utils.InactiveItemStyle
	delegate.Styles.NormalDesc = utils.InactiveItemStyle.Copy().Foreground(utils.ColorMuted)

	l := list.New(items, delegate, width, height-4)
	l.Title = "Search Results"
	l.Styles.Title = utils.TitleStyle
	l.SetShowHelp(false)
	l.SetShowStatusBar(false)
	l.SetShowPagination(true)

	return &SearchResultsListModel{
		list:    l,
		results: results,
		width:   width,
		height:  height,
	}
}

// Update implements tea.Model
func (m *SearchResultsListModel) Update(msg tea.Msg) (*SearchResultsListModel, tea.Cmd) {
	var cmd tea.Cmd

	switch msg := msg.(type) {
	case tea.WindowSizeMsg:
		m.width = msg.Width
		m.height = msg.Height
		m.list.SetSize(msg.Width, msg.Height-4)
	}

	m.list, cmd = m.list.Update(msg)
	return m, cmd
}

// View implements tea.Model
func (m *SearchResultsListModel) View() string {
	if len(m.results) == 0 {
		return utils.MutedStyle.Render("No results found. Try a different search term.")
	}

	return m.list.View()
}

// SelectedNode returns the currently selected node
func (m *SearchResultsListModel) SelectedNode() *models.Node {
	if item := m.list.SelectedItem(); item != nil {
		if node, ok := item.(ListItem).Value().(models.Node); ok {
			return &node
		}
	}
	return nil
}

// NodesListModel specialized list for displaying nodes
type NodesListModel struct {
	list   list.Model
	nodes  []models.Node
	width  int
	height int
}

// NewNodesListModel creates a new nodes list
func NewNodesListModel(nodes []models.Node, width, height int) *NodesListModel {
	items := make([]list.Item, len(nodes))

	for i, node := range nodes {
		title := fmt.Sprintf("%s %s",
			utils.FormatNodeType(string(node.Type)),
			node.Title,
		)

		description := node.GetPreview()
		if node.IsPublic {
			description = "🌐 " + description
		} else {
			description = "🔒 " + description
		}

		items[i] = NewListItem(title, description, node)
	}

	delegate := list.NewDefaultDelegate()
	delegate.Styles.SelectedTitle = utils.ActiveItemStyle
	delegate.Styles.SelectedDesc = utils.ActiveItemStyle.Copy().Foreground(utils.ColorMuted)
	delegate.Styles.NormalTitle = utils.InactiveItemStyle
	delegate.Styles.NormalDesc = utils.InactiveItemStyle.Copy().Foreground(utils.ColorMuted)

	l := list.New(items, delegate, width, height-4)
	l.Title = "Select Node"
	l.Styles.Title = utils.TitleStyle
	l.SetShowHelp(false)
	l.SetShowStatusBar(false)
	l.SetShowPagination(true)
	l.SetFilteringEnabled(true)

	return &NodesListModel{
		list:   l,
		nodes:  nodes,
		width:  width,
		height: height,
	}
}

// Update implements tea.Model
func (m *NodesListModel) Update(msg tea.Msg) (*NodesListModel, tea.Cmd) {
	var cmd tea.Cmd

	switch msg := msg.(type) {
	case tea.WindowSizeMsg:
		m.width = msg.Width
		m.height = msg.Height
		m.list.SetSize(msg.Width, msg.Height-4)
	}

	m.list, cmd = m.list.Update(msg)
	return m, cmd
}

// View implements tea.Model
func (m *NodesListModel) View() string {
	if len(m.nodes) == 0 {
		return utils.MutedStyle.Render("No nodes available.")
	}

	return m.list.View()
}

// SelectedNode returns the currently selected node
func (m *NodesListModel) SelectedNode() *models.Node {
	if item := m.list.SelectedItem(); item != nil {
		if node, ok := item.(ListItem).Value().(models.Node); ok {
			return &node
		}
	}
	return nil
}
