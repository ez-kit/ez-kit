import type { BetweenValue, FilterOperatorDef, MultiSelectOption } from '@ez-kit/data-grid-core'
import type { Column, Row } from '@tanstack/table-core'
import type {
	ButtonHTMLAttributes,
	ComponentType,
	HTMLAttributes,
	InputHTMLAttributes,
	MouseEventHandler,
	ReactElement,
	ReactNode,
	TdHTMLAttributes,
	ThHTMLAttributes,
	TouchEventHandler,
} from 'react'

export type CreatingActionsCellProps = {
	onSave: () => Promise<void>
	onCancel: () => void
	isPinRow: boolean
	/** True while a commit is in flight (`commitStatus !== 'idle'`). */
	isPending: boolean
}

export type ActionsCellProps = {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	row: Row<any>
	isEditing: boolean
	hasEditing: boolean
	hasDeleting: boolean
	/** The editing mode configured on the table. Undefined when editing is not configured. */
	editingMode?: 'row' | 'modal' | 'cell' | undefined
	onEdit: () => void
	onDelete: () => void
	onSave: () => Promise<void>
	onCancel: () => void
	/** True while an editing commit is in flight (`commitStatus !== 'idle'`). */
	isPending: boolean
}

// ── primitive component props ─────────────────────────────────────────────

export type TableProps = HTMLAttributes<HTMLTableElement>
export type TheadProps = HTMLAttributes<HTMLTableSectionElement>
export type TbodyProps = HTMLAttributes<HTMLTableSectionElement>
export type TrProps = HTMLAttributes<HTMLTableRowElement>
export type ThProps = ThHTMLAttributes<HTMLTableCellElement> & { pinned?: 'left' | 'right' | false }
export type TdProps = TdHTMLAttributes<HTMLTableCellElement> & { pinned?: 'left' | 'right' | false }
export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement>
export type InputProps = InputHTMLAttributes<HTMLInputElement>

export type CheckboxProps = {
	value?: boolean | undefined
	indeterminate?: boolean
	disabled?: boolean
	onChange?: (checked: boolean) => void
	'aria-label'?: string
}

export type NumberInputProps = {
	value?: number | undefined
	onChange?: (value: number | undefined) => void
	onBlur?: () => void
}

export type ModalProps = {
	open: boolean
	onClose: () => void
	title?: string
	children?: ReactNode
	onSave?: () => void
	onCancel?: () => void
}

export type ToolbarProps = {
	children?: ReactNode
	left?: ReactNode
	right?: ReactNode
}

/**
 * Props for the UI-kit Global Filter input (search field).
 * - `value` / `onChange` are wired by the headless wrapper to the table's
 *   `state.globalFilter`. When the user types, the wrapper applies the optional
 *   debounce before calling `onChange`.
 * - `placeholder` is forwarded from `globalFiltering.placeholder`.
 * - `debounce` is informational — the wrapper has already applied debounce; the
 *   UI-kit input does not need to debounce again. Exposed so kits can show
 *   pending state if desired.
 */
export type GlobalFilterInputProps = {
	value: string
	onChange: (value: string) => void
	placeholder?: string
	debounce?: number
}

export type PaginationProps = {
	pageIndex: number
	pageCount: number
	canPreviousPage: boolean
	canNextPage: boolean
	onPreviousPage: () => void
	onNextPage: () => void
	onFirstPage: () => void
	onLastPage: () => void
	onPageChange: (pageIndex: number) => void
}

export type PageSizerProps = {
	pageSize: number
	items: number[]
	onPageSizeChange: (size: number) => void
}

export type ResizerProps = {
	onMouseDown: MouseEventHandler<HTMLDivElement>
	onTouchStart: TouchEventHandler<HTMLDivElement>
	onDoubleClick: MouseEventHandler<HTMLDivElement>
	/** True while the user is actively dragging this column border. */
	isResizing: boolean
}

export type RowPinMenuProps = {
	isPinned: 'top' | 'bottom' | false
	canPinTop: boolean
	canPinBottom: boolean
	onPinTop: () => void
	onPinBottom: () => void
	onUnpin: () => void
}

export type ColPinSection = {
	isPinned: 'left' | 'right' | false
	canPinLeft: boolean
	canPinRight: boolean
	onPinLeft: () => void
	onPinRight: () => void
	onUnpin: () => void
}

export type SortIndicatorProps = {
	sortDir: 'asc' | 'desc' | false
	canSort: boolean
}

export type ColVisibilitySection = {
	onHide: () => void
}

export type ColSortSection = {
	currentSort: 'asc' | 'desc' | false
	canAsc: boolean
	canDesc: boolean
	onSortAsc: () => void
	onSortDesc: () => void
	onClearSort: () => void
}

export type ColumnMenuSections = {
	pin?: ColPinSection
	visibility?: ColVisibilitySection
	sorting?: ColSortSection
}

export type ColumnMenuProps = {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	column: Column<any>
	sections: ColumnMenuSections
}

export type VisibilityColumnItem = {
	id: string
	label: string
	isVisible: boolean
	onToggle: () => void
}

export type ColumnVisibilityMenuProps = {
	columns: VisibilityColumnItem[]
}

export type SortDirection = 'asc' | 'desc'

export type SortColumnOption = {
	id: string
	label: string
}

export type SortMenuItem = {
	columnId: string
	direction: SortDirection
	/** Columns the user may pick for this row — already excludes columns used by other rows. */
	availableColumns: SortColumnOption[]
	onChangeColumn: (columnId: string) => void
	onChangeDirection: (direction: SortDirection) => void
	onRemove: () => void
}

export type SortMenuProps = {
	items: SortMenuItem[]
	canAddSort: boolean
	onAddSort: () => void
	onResetSorting: () => void
}

export type FilterPopoverProps = {
	children: ReactNode
	hasActiveFilter: boolean
}

export type FilterChipKind = 'column' | 'global'

export type FilterChipProps = {
	/** Human label for the chip — column header for `kind: 'column'`, "Search" for `kind: 'global'`. */
	label: string
	/** Pre-rendered display of the filter value (operator + value, between range, list, etc.). */
	value: ReactNode
	/** Remove this filter. Adapter wires it to `column.setFilterValue(undefined)` or `table.setGlobalFilter(undefined)`. */
	onRemove: () => void
	/** Where the filter comes from. Kits may style column vs. global chips differently. */
	kind: FilterChipKind
}

export type ClearFiltersButtonComponentProps = {
	/** True when no filter is active; kit can render the button in a disabled state. */
	disabled: boolean
	/** Clear every column filter and the global filter. */
	onPress: () => void
	/** Optional custom contents. When absent the kit renders its default (icon-only). */
	children?: ReactNode
	/** Accessibility label. Defaults to "Clear filters" when omitted. */
	ariaLabel?: string
}

export type OperatorSelectProps = {
	operators: FilterOperatorDef[]
	currentOperatorId: string
	onChange: (operatorId: string) => void
}

export type BetweenInputProps = {
	value: BetweenValue
	onChange: (value: BetweenValue) => void
	variant: 'inputs' | 'slider' | 'calendar'
	type: 'number' | 'date'
	min?: number
	max?: number
}

export type { MultiSelectOption }

export type MultiSelectFilterProps = {
	/** Available options. Counts (when present) come from faceted unique values. */
	options: MultiSelectOption[]
	/** Currently selected option values. Empty array = no filter. */
	selectedValues: string[]
	/** Called with the next array of selected values. */
	onChange: (next: string[]) => void
	/** Optional trigger placeholder (e.g. "Filter status"). */
	placeholder?: string
}

export type ConfirmDialogProps = {
	open: boolean
	title: string
	description: string
	onConfirm: () => void
	onCancel: () => void
}

/**
 * Form shell — unified slot for `creating` / `editing` modal forms.
 * Owns the modal chrome, form-level error banner, action buttons, and pending state.
 * Body content (`children`) is the `<AutoForm>`-style field list rendered by the data-grid layer.
 */
export type FormShellProps = {
	open: boolean
	title: string
	formError: string | null
	/** True while validate or onSave is in flight (`commitStatus !== 'idle'`). */
	isPending: boolean
	onSave: () => Promise<void>
	onCancel: () => void
	children: ReactNode
}

export type LoadingRowProps = {
	columnCount: number
}

export type EmptyStateProps = {
	columnCount: number
}

export type NoResultsStateProps = {
	columnCount: number
}

export type SelectionBarProps = {
	/** False when 0 rows selected — component should hide/animate out. */
	open: boolean
	/** Number of currently selected rows. */
	count: number
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	selectedRows: Row<any>[]
	/**
	 * Render mode the consumer requested.
	 * - `'floating'` (default) — sticky/positioned bar, may overlay content.
	 * - `'inline'` — rendered in normal document flow (between Toolbar and Table).
	 */
	variant: 'floating' | 'inline'
	/**
	 * Pre-bound delete handler. Only present when `onDelete` was configured.
	 * When absent — Delete button must NOT be rendered.
	 */
	onDelete?: () => void
	/**
	 * Pre-bound clear handler.
	 * If user did not provide `onClear`, this calls `table.resetRowSelection()`.
	 */
	onClear: () => void
	/** Already-resolved actions slot (ReactElement | undefined). */
	actions?: ReactElement
}

export type ChevronProps = {
	expanded: boolean
	onClick: () => void
	disabled?: boolean
}

// ── DI registry ──────────────────────────────────────────────────────────

export type GridComponents = {
	// layout
	Table?: ComponentType<TableProps>
	Thead?: ComponentType<TheadProps>
	Tbody?: ComponentType<TbodyProps>
	Tr?: ComponentType<TrProps>
	Th?: ComponentType<ThProps>
	Td?: ComponentType<TdProps>
	// primitives
	Button?: ComponentType<ButtonProps>
	Input?: ComponentType<InputProps>
	Checkbox?: ComponentType<CheckboxProps>
	NumberInput?: ComponentType<NumberInputProps>
	Modal?: ComponentType<ModalProps>
	// composite
	Toolbar?: ComponentType<ToolbarProps>
	GlobalFilterInput?: ComponentType<GlobalFilterInputProps>
	Pagination?: ComponentType<PaginationProps>
	PageSizer?: ComponentType<PageSizerProps>
	// data-grid specific
	Resizer?: ComponentType<ResizerProps>
	SortIndicator?: ComponentType<SortIndicatorProps>
	RowPinMenu?: ComponentType<RowPinMenuProps>
	ColumnMenu?: ComponentType<ColumnMenuProps>
	ColumnVisibilityMenu?: ComponentType<ColumnVisibilityMenuProps>
	SortMenu?: ComponentType<SortMenuProps>
	FilterPopover?: ComponentType<FilterPopoverProps>
	FilterChip?: ComponentType<FilterChipProps>
	ClearFiltersButton?: ComponentType<ClearFiltersButtonComponentProps>
	SelectionBar?: ComponentType<SelectionBarProps>
	ConfirmDialog?: ComponentType<ConfirmDialogProps>
	OperatorSelect?: ComponentType<OperatorSelectProps>
	BetweenInput?: ComponentType<BetweenInputProps>
	MultiSelectFilter?: ComponentType<MultiSelectFilterProps>
	// fallback states
	LoadingRow?: ComponentType<LoadingRowProps>
	EmptyState?: ComponentType<EmptyStateProps>
	NoResultsState?: ComponentType<NoResultsStateProps>
	// row actions
	ActionsCell?: ComponentType<ActionsCellProps>
	CreatingActionsCell?: ComponentType<CreatingActionsCellProps>
	// form shell (creating / editing modal)
	FormShell?: ComponentType<FormShellProps>
	// expand
	Chevron?: ComponentType<ChevronProps>
}
