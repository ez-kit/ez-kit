export enum FeatureStatus {
	Done = 'done',
	InProgress = 'in-progress',
	Planned = 'planned',
}

export type FeatureRow = {
	category: string
	feature: string
	description: string
	status: FeatureStatus
	doc?: string
}

export const FEATURE_MATRIX: readonly FeatureRow[] = [
	// Editing & CRUD
	{
		category: 'Editing & CRUD',
		feature: 'Inline / modal / cell editing',
		description: 'Edit rows via inline fields, modal dialog, or per-cell activation.',
		status: FeatureStatus.Done,
		doc: 'editing',
	},
	{
		category: 'Editing & CRUD',
		feature: 'Row creating (row / modal / pin-row)',
		description: 'Add new rows via an inline empty row, modal form, or pinned creation row.',
		status: FeatureStatus.Done,
		doc: 'editing/creating',
	},
	{
		category: 'Editing & CRUD',
		feature: 'Delete + confirmation dialog',
		description: 'Remove selected rows with a confirmation step to prevent accidental deletion.',
		status: FeatureStatus.Done,
		doc: 'selection/delete-confirmation',
	},
	{
		category: 'Editing & CRUD',
		feature: 'Validation (Zod + server-side)',
		description: 'Schema-based field validation with Zod and server-side error surfacing.',
		status: FeatureStatus.Done,
		doc: 'editing/validation',
	},
	{
		category: 'Editing & CRUD',
		feature: 'Server-side CRUD (basic)',
		description: 'Persist creates, updates, and deletes to a remote API.',
		status: FeatureStatus.Done,
		doc: 'editing/crud-server',
	},
	{
		category: 'Editing & CRUD',
		feature: 'Server-side mode (full async)',
		description: 'Full async server mode with manual pagination/sort/filter, rowCount, controlled state.loading (isPending/isFetching/isError/error), and refetch overlay.',
		status: FeatureStatus.Done,
		doc: 'server-side',
	},
	{
		category: 'Editing & CRUD',
		feature: 'Cursor-based pagination',
		description: 'Server-side pagination using opaque cursors instead of page offsets.',
		status: FeatureStatus.Planned,
	},

	// Data & Display
	{
		category: 'Data & Display',
		feature: 'Sorting (client / server / multi-column)',
		description: 'Sort by one or more columns, either locally or delegated to the server.',
		status: FeatureStatus.Done,
		doc: 'sorting',
	},
	{
		category: 'Data & Display',
		feature: 'Pagination (client / server)',
		description: 'Page through rows with client-side or server-driven pagination.',
		status: FeatureStatus.Done,
		doc: 'pagination',
	},
	{
		category: 'Data & Display',
		feature: 'Infinite scroll (forward)',
		description: 'Append the next page automatically as the user scrolls to the bottom.',
		status: FeatureStatus.Done,
		doc: 'pagination/infinite-scroll',
	},
	{
		category: 'Data & Display',
		feature: 'Row virtualization',
		description: 'Render only visible rows for smooth performance with large datasets.',
		status: FeatureStatus.Done,
		doc: 'virtualization',
	},
	{
		category: 'Data & Display',
		feature: 'Sticky header',
		description: 'Keep the column header row visible while scrolling through data.',
		status: FeatureStatus.Done,
		doc: 'sticky-header',
	},
	{
		category: 'Data & Display',
		feature: 'Loading / empty / no-results states',
		description: 'Built-in fallback UI for loading skeletons, empty tables, and zero-result filters.',
		status: FeatureStatus.Done,
		doc: 'fallbacks',
	},

	// Filtering
	{
		category: 'Filtering',
		feature: 'Column filtering + operators',
		description: 'Per-column filters with configurable operators (contains, equals, before, after…).',
		status: FeatureStatus.Done,
		doc: 'filtering/operators',
	},
	{
		category: 'Filtering',
		feature: 'Global search',
		description: 'Single search input that filters across all visible columns simultaneously.',
		status: FeatureStatus.Done,
		doc: 'filtering/global',
	},
	{
		category: 'Filtering',
		feature: 'Filter panel · active chips · clear-all',
		description: 'Slide-out filter panel with active filter chips and a one-click clear-all action.',
		status: FeatureStatus.Done,
		doc: 'filtering/panel',
	},
	{
		category: 'Filtering',
		feature: 'Date-range + presets',
		description: 'Date-range picker with built-in presets like "last 7 days" or "this month".',
		status: FeatureStatus.Done,
		doc: 'filtering/date-range',
	},
	{
		category: 'Filtering',
		feature: 'Multi-value / faceted filter',
		description: 'Filter by multiple selected values from a faceted list per column.',
		status: FeatureStatus.Done,
		doc: 'filtering/multi-value',
	},
	{
		category: 'Filtering',
		feature: 'Saved filter presets / quick chips',
		description: 'Save and recall named filter configurations as quick-access chips.',
		status: FeatureStatus.Planned,
	},

	// Columns
	{
		category: 'Columns',
		feature: 'Column pinning (sticky)',
		description: 'Pin columns to the left or right so they stay visible during horizontal scroll.',
		status: FeatureStatus.Done,
		doc: 'columns/column-pinning',
	},
	{
		category: 'Columns',
		feature: 'Column visibility',
		description: 'Toggle individual columns on or off via a column picker menu.',
		status: FeatureStatus.Done,
		doc: 'columns/column-visibility',
	},
	{
		category: 'Columns',
		feature: 'Column resizing',
		description: 'Drag column borders to resize widths interactively.',
		status: FeatureStatus.Done,
		doc: 'columns/resizing',
	},
	{
		category: 'Columns',
		feature: 'Column reordering (drag)',
		description: 'Reorder columns by dragging and dropping column headers.',
		status: FeatureStatus.Planned,
	},

	// Rows & Selection
	{
		category: 'Rows & Selection',
		feature: 'Row selection (single / multi)',
		description: 'Select one or many rows via checkboxes or click, with keyboard support.',
		status: FeatureStatus.Done,
		doc: 'selection',
	},
	{
		category: 'Rows & Selection',
		feature: 'Selection bar / bulk actions',
		description: 'Contextual action bar that appears when rows are selected for bulk operations.',
		status: FeatureStatus.Done,
		doc: 'selection/selection-bar',
	},
	{
		category: 'Rows & Selection',
		feature: 'Row expanding / sub-rows / tree',
		description: 'Expand rows to reveal nested child rows in a tree structure.',
		status: FeatureStatus.Done,
		doc: 'expanding/tree',
	},
	{
		category: 'Rows & Selection',
		feature: 'Row pinning (top / bottom)',
		description: 'Pin individual rows to the top or bottom of the grid.',
		status: FeatureStatus.Done,
		doc: 'row-pinning',
	},
	{
		category: 'Rows & Selection',
		feature: 'Row drag reorder',
		description: 'Reorder rows by dragging them to a new position.',
		status: FeatureStatus.Planned,
	},
	{
		category: 'Rows & Selection',
		feature: 'Row grouping + aggregation',
		description: 'Group rows by a column value and display aggregated summaries.',
		status: FeatureStatus.Planned,
	},

	// Cells
	{
		category: 'Cells',
		feature: 'Built-in + rich cell types (select/badge/image/link/progress)',
		description: 'Ready-to-use cell renderers for common data types including badges, images, and progress bars.',
		status: FeatureStatus.Done,
		doc: 'cells/cell-types',
	},
	{
		category: 'Cells',
		feature: 'Custom cell types',
		description: 'Define reusable typed cell renderers with full TypeScript inference.',
		status: FeatureStatus.Done,
		doc: 'cells/custom-cell-types',
	},
	{
		category: 'Cells',
		feature: 'Additional types (currency, percent, rating…)',
		description: 'Extended built-in cell types for currency values, percentages, and star ratings.',
		status: FeatureStatus.Planned,
	},

	// State & Tooling
	{
		category: 'State & Tooling',
		feature: 'Controlled state / snapshot & restore',
		description: 'Own the grid state externally and serialize or restore it at any time.',
		status: FeatureStatus.Done,
		doc: 'controlled-state',
	},
	{
		category: 'State & Tooling',
		feature: 'Theming',
		description: 'Customize colors, spacing, and typography via CSS variables or design tokens.',
		status: FeatureStatus.Done,
		doc: 'theming',
	},
	{
		category: 'State & Tooling',
		feature: 'URL / localStorage state persistence',
		description:
			'Extract grid state (sort, filters, page, column layout) for the URL or localStorage, and seed it back on load.',
		status: FeatureStatus.Done,
		doc: 'state-persistence',
	},
	{
		category: 'State & Tooling',
		feature: 'CSV / JSON export',
		description: 'Export visible rows to CSV or JSON with a single function call.',
		status: FeatureStatus.Planned,
	},
	{
		category: 'State & Tooling',
		feature: 'i18n / messages',
		description: 'Override all built-in labels and messages for internationalization.',
		status: FeatureStatus.Planned,
	},
	{
		category: 'State & Tooling',
		feature: 'Density modes',
		description: 'Switch between compact, default, and comfortable row height modes.',
		status: FeatureStatus.Planned,
	},
	{
		category: 'State & Tooling',
		feature: 'Full ARIA grid + keyboard navigation',
		description: 'Complete ARIA grid role implementation with full keyboard navigation support.',
		status: FeatureStatus.Planned,
	},
]
