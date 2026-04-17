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

// ── primitive component props ─────────────────────────────────────────────

export type TableProps = HTMLAttributes<HTMLTableElement>
export type TheadProps = HTMLAttributes<HTMLTableSectionElement>
export type TbodyProps = HTMLAttributes<HTMLTableSectionElement>
export type TrProps = HTMLAttributes<HTMLTableRowElement>
export type ThProps = ThHTMLAttributes<HTMLTableCellElement>
export type TdProps = TdHTMLAttributes<HTMLTableCellElement>
export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement>
export type InputProps = InputHTMLAttributes<HTMLInputElement>

export interface CheckboxProps {
	value?: boolean | undefined
	indeterminate?: boolean
	onChange?: (checked: boolean) => void
	'aria-label'?: string
}

export interface NumberInputProps {
	value?: number | undefined
	onChange?: (value: number | undefined) => void
}

export interface DateFieldProps {
	/** ISO date string, e.g. `"2024-01-15"` */
	value?: string | undefined
	onChange?: (value: string) => void
}

export interface ModalProps {
	open: boolean
	onClose: () => void
	title?: string
	children?: ReactNode
}

export interface ToolbarProps {
	children?: ReactNode
}

export interface PaginationProps {
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

export interface PageSizerProps {
	pageSize: number
	items: number[]
	onPageSizeChange: (size: number) => void
}

export interface ResizerProps {
	onMouseDown: MouseEventHandler<HTMLDivElement>
	onTouchStart: TouchEventHandler<HTMLDivElement>
	onDoubleClick: MouseEventHandler<HTMLDivElement>
	/** True while the user is actively dragging this column border. */
	isResizing: boolean
}

export interface RowPinMenuProps {
	isPinned: 'top' | 'bottom' | false
	canPinTop: boolean
	canPinBottom: boolean
	onPinTop: () => void
	onPinBottom: () => void
	onUnpin: () => void
}

export interface ColPinSection {
	isPinned: 'left' | 'right' | false
	canPinLeft: boolean
	canPinRight: boolean
	onPinLeft: () => void
	onPinRight: () => void
	onUnpin: () => void
}

export interface ColumnMenuSections {
	pin?: ColPinSection
}

export interface ColumnMenuProps {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	column: Column<any>
	sections: ColumnMenuSections
}

export interface SelectionBarProps {
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

// ── DI registry ──────────────────────────────────────────────────────────

export interface GridComponents {
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
	RowPinMenu?: ComponentType<RowPinMenuProps>
	ColumnMenu?: ComponentType<ColumnMenuProps>
	SelectionBar?: ComponentType<SelectionBarProps>
}
