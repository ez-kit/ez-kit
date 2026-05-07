import type { BetweenValue, FilterOperatorDef } from '@ez-kit/data-grid-core'
import type { Column, Row } from '@tanstack/table-core'

export type CreatingActionsCellProps = {
	onSave: () => Promise<void>
	onCancel: () => void
	isPinRow: boolean
}

export type ActionsCellProps = {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	row: Row<any>
	isEditing: boolean
	hasEditing: boolean
	hasDeleting: boolean
	/** The editing mode configured on the table. Undefined when editing is not configured. */
	editingMode?: 'row' | 'modal' | 'cell'
	onEdit: () => void
	onDelete: () => void
	onSave: () => Promise<void>
	onCancel: () => void
}
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
}

export type DateFieldProps = {
	/** ISO date string, e.g. `"2024-01-15"` */
	value?: string | undefined
	onChange?: (value: string) => void
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

export type FilterPopoverProps = {
	children: ReactNode
	hasActiveFilter: boolean
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

export type ConfirmDialogProps = {
	open: boolean
	title: string
	description: string
	onConfirm: () => void
	onCancel: () => void
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
	DateField?: ComponentType<DateFieldProps>
	Modal?: ComponentType<ModalProps>
	// composite
	Toolbar?: ComponentType<ToolbarProps>
	Pagination?: ComponentType<PaginationProps>
	PageSizer?: ComponentType<PageSizerProps>
	// data-grid specific
	Resizer?: ComponentType<ResizerProps>
	SortIndicator?: ComponentType<SortIndicatorProps>
	RowPinMenu?: ComponentType<RowPinMenuProps>
	ColumnMenu?: ComponentType<ColumnMenuProps>
	ColumnVisibilityMenu?: ComponentType<ColumnVisibilityMenuProps>
	FilterPopover?: ComponentType<FilterPopoverProps>
	SelectionBar?: ComponentType<SelectionBarProps>
	ConfirmDialog?: ComponentType<ConfirmDialogProps>
	OperatorSelect?: ComponentType<OperatorSelectProps>
	BetweenInput?: ComponentType<BetweenInputProps>
	// fallback states
	LoadingRow?: ComponentType<LoadingRowProps>
	EmptyState?: ComponentType<EmptyStateProps>
	NoResultsState?: ComponentType<NoResultsStateProps>
	// row actions
	ActionsCell?: ComponentType<ActionsCellProps>
	CreatingActionsCell?: ComponentType<CreatingActionsCellProps>
	// expand
	Chevron?: ComponentType<ChevronProps>
}
