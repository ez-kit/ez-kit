import {
	ACTIONS_COLUMN_ID,
	CommitStatus,
	EditingMode,
	EXPAND_COLUMN_ID,
	SELECTION_COLUMN_ID,
} from '@ez-kit/data-grid-core'
import { useEffect } from 'react'

import { useCellTypes } from '../cell-types-context'
import { useGridComponents } from '../components-context'
import { resolveCellClassName } from '../utils/class-names'
import { getCommonPinStyles } from '../utils/pin-styles'

import { ActionsCell } from './actions-cell'
import { getAlignAttrs } from './align-attrs'
import { flexRender } from './flex-render'
import { useDataGridTable, useDataGridState } from './table-context'

import type { CellTypeRegistry, CellViewProps } from '../cell-types-context'
import type { ColumnAlign, ColumnPinSide, FieldState } from '@ez-kit/data-grid-core'
import type { ColumnMeta, Cell, Row } from '@tanstack/table-core'
import type { ComponentType, CSSProperties, ReactNode } from 'react'

/**
 * What a `<DataGrid.Cell>` render function receives.
 *
 * `TRow` defaults to `any` so nothing has to name it. Write it once at the call site —
 * `<DataGrid.Cell<Order>>` — and the render arguments are typed: `row.original` is an `Order`.
 * See {@link DataGridBodyRenderArgs} for why it is explicit rather than inferred.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type DataGridCellRenderArgs<TRow extends object = any> = {
	cell: Cell<TRow, unknown>
	row: Row<TRow>
	/** The cell's value, already resolved through the column's accessor. */
	value: unknown
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type DataGridCellProps<TRow extends object = any> = {
	cell: Cell<TRow, unknown>
	row: Row<TRow>
	/**
	 * Custom content for this one cell, rendered inside the kit's `Td` — so the cell keeps its
	 * pinning offset, its `data-*` attributes and its `cellClassName`.
	 *
	 * Omit it for the built-in content: the cell-type renderer, the inline editor, the system
	 * column controls. Supply it to replace just the content of one cell.
	 *
	 * A column-wide override belongs on the column instead (`cell.component`), which also feeds
	 * the create and edit forms; this is for a single cell in a hand-composed row.
	 */
	children?: ReactNode | ((args: DataGridCellRenderArgs<TRow>) => ReactNode)
}

/** The chrome a body cell wears regardless of what it renders: pin offsets and alignment. */
type CellChrome = {
	pinVars: CSSProperties
	pinned: false | ColumnPinSide
	pinnedAttrs: { 'data-pinned'?: ColumnPinSide }
	alignAttrs: { 'data-align'?: ColumnAlign }
}

const EMPTY_ERRORS: readonly string[] = Object.freeze([])

/** Marks the one cell currently open for editing, so a pointer or focus event can be placed. */
const EDITING_CELL_ATTR = 'data-editing-cell'

/**
 * Layers a kit renders in a portal on the editor's behalf — a select's listbox, a date picker's
 * dialog. They sit outside the cell in the DOM while belonging to it, so interacting with one must
 * not read as leaving the edit. Covers react-aria (heroui) and radix (shadcn) overlays alike.
 */
const OVERLAY_SELECTOR = '[role="dialog"], [role="listbox"], [role="menu"], [data-radix-popper-content-wrapper]'

/** What an opened cell hands the caret to. Ordered by document position, so the first one wins. */
const FOCUSABLE_SELECTOR = 'input, select, textarea, button, [contenteditable="true"], [tabindex]:not([tabindex="-1"])'

/**
 * Renders a single table body cell.
 *
 * Dispatches to:
 * - {@link SystemCell} — for selection / expand / actions / row-pin system columns
 * - {@link BodyDataCell} — for regular data columns (with narrow editing subscription)
 *
 * Emits `data-slot="td"` plus `data-pinned="left" | "right"` for pinned columns;
 * pin offsets are written as CSS custom properties via {@link getCommonPinStyles}.
 * The structural stylesheet shipped with this package applies the actual
 * `position: sticky` + offsets.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function DataGridCell<TRow extends object = any>({ cell, row, children }: DataGridCellProps<TRow>) {
	const meta = cell.column.columnDef.meta
	if (children !== undefined) {
		return (
			<CustomCell
				cell={cell}
				row={row}
			>
				{children}
			</CustomCell>
		)
	}
	if (meta?.isSystemColumn) {
		return (
			<SystemCell
				cell={cell}
				row={row}
			/>
		)
	}
	return (
		<BodyDataCell
			cell={cell}
			row={row}
		/>
	)
}

/**
 * A cell whose content the caller supplied. Keeps the `Td` shell — pinning vars, `data-slot`,
 * `data-pinned` and the column's `cellClassName` — so a replaced cell still lines up with its
 * neighbours and its pinned column still sticks.
 */
function CustomCell({ cell, row, children }: DataGridCellProps) {
	const { Td } = useGridComponents().core
	const meta = cell.column.columnDef.meta
	const chrome = getCellChrome(cell)
	const cellClassName = resolveCellClassName(meta?.cellClassName, {
		row: row.original as unknown,
		value: cell.getValue<unknown>(),
		rowIndex: row.index,
	})

	return (
		<Td
			data-slot='td'
			style={chrome.pinVars}
			pinned={chrome.pinned}
			{...chrome.pinnedAttrs}
			{...chrome.alignAttrs}
			{...(cellClassName !== undefined ? { className: cellClassName } : {})}
		>
			{typeof children === 'function' ? children({ cell, row, value: cell.getValue<unknown>() }) : children}
		</Td>
	)
}

// ── system columns ──────────────────────────────────────────────────────────

function SystemCell({ cell, row }: DataGridCellProps) {
	const columnId = cell.column.id
	const chrome = getCellChrome(cell)
	const { Td } = useGridComponents().core

	if (columnId === SELECTION_COLUMN_ID) {
		return (
			<SelectionCell
				row={row}
				chrome={chrome}
			/>
		)
	}
	if (columnId === EXPAND_COLUMN_ID) {
		return (
			<ExpandCell
				row={row}
				chrome={chrome}
			/>
		)
	}
	if (columnId === ACTIONS_COLUMN_ID) {
		return (
			<Td
				data-slot='td'
				style={chrome.pinVars}
				pinned={chrome.pinned}
				{...chrome.pinnedAttrs}
				{...chrome.alignAttrs}
				data-system-column='actions'
			>
				<ActionsCell row={row} />
			</Td>
		)
	}
	return null
}

type SystemSubProps = {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	row: Row<any>
	chrome: CellChrome
}

function SelectionCell({ row, chrome }: SystemSubProps) {
	const { Td, Checkbox } = useGridComponents().core
	const { messages } = useDataGridTable().grid
	// Subscribe broadly to rowSelection so row.getIsSelected() / getIsSomeSelected()
	// re-derive correctly. Refining this to per-row keys breaks indeterminate
	// state for parent rows (which depends on children).
	useDataGridState((s) => s.rowSelection)
	const isSelected = row.getIsSelected()
	const isIndeterminate = typeof row.getIsSomeSelected === 'function' ? row.getIsSomeSelected() : undefined
	return (
		<Td
			data-slot='td'
			style={chrome.pinVars}
			pinned={chrome.pinned}
			{...chrome.pinnedAttrs}
			{...chrome.alignAttrs}
		>
			<Checkbox
				value={isSelected}
				{...(isIndeterminate !== undefined ? { indeterminate: isIndeterminate } : {})}
				onChange={() => {
					row.toggleSelected()
				}}
				aria-label={messages.selection.selectRow}
			/>
		</Td>
	)
}

function ExpandCell({ row, chrome }: SystemSubProps) {
	const gridComponents = useGridComponents()
	const { Td } = gridComponents.core
	const { Chevron } = gridComponents.expanding
	// Subscribe broadly to expanded so derived row.getIsExpanded() re-renders.
	useDataGridState((s) => s.expanded)
	const canExpand = row.getCanExpand()
	const isExpanded = row.getIsExpanded()
	return (
		<Td
			data-slot='td'
			style={chrome.pinVars}
			pinned={chrome.pinned}
			{...chrome.pinnedAttrs}
			{...chrome.alignAttrs}
			data-system-column='expand'
			data-depth={row.depth}
		>
			{canExpand ? (
				<Chevron
					expanded={isExpanded}
					onClick={() => {
						row.toggleExpanded()
					}}
				/>
			) : null}
		</Td>
	)
}

// ── data columns ────────────────────────────────────────────────────────────

function BodyDataCell({ cell, row }: DataGridCellProps) {
	const table = useDataGridTable()
	const { Td } = useGridComponents().core
	const cellTypes = useCellTypes()
	const columnId = cell.column.id
	const meta = cell.column.columnDef.meta
	const chrome = getCellChrome(cell)

	const editMode: EditingMode = table.options.editing?.mode ?? EditingMode.Row
	const cellId = `${row.id}_${columnId}`

	// Narrow boolean subscription. For non-target rows this remains stably `false`
	// across any `editing` mutation → no re-render. Flips exactly once on
	// start / cancel / commit of THIS row (or cell in cell-mode).
	const isEditing = useDataGridState((s) =>
		editMode === EditingMode.Cell ? s.editing.cellId === cellId : s.editing.rowId === row.id,
	)

	const isColumnEditable = meta?.editing !== false

	if (isEditing && isColumnEditable) {
		return (
			<EditingCell
				cell={cell}
				editMode={editMode}
				cellId={cellId}
				chrome={chrome}
			/>
		)
	}

	// ── normal view cell ───────────────────────────────────────────────────────
	// `editing: false` opts a column out at every mode, cell mode included: it used to be
	// bypassed here, so a read-only column still became an input on double-click.
	const handleDoubleClick =
		editMode === EditingMode.Cell && isColumnEditable
			? () => {
					table.editing.startCell(row.id, columnId)
				}
			: undefined

	const viewComp = resolveViewComponent(meta, cellTypes)
	const cellClassName = resolveCellClassName(meta?.cellClassName, {
		row: cell.row.original as unknown,
		value: cell.getValue<unknown>(),
		rowIndex: cell.row.index,
	})

	return (
		<Td
			data-slot='td'
			style={chrome.pinVars}
			pinned={chrome.pinned}
			{...chrome.pinnedAttrs}
			{...chrome.alignAttrs}
			{...(cellClassName !== undefined ? { className: cellClassName } : {})}
			onDoubleClick={handleDoubleClick}
		>
			{viewComp
				? flexRender(viewComp, {
						// `cell` is row-type-erased here, so `getValue()` and `row.original` are both
						// `any`. The view contract says `unknown` — narrow once, at the boundary.
						value: cell.getValue<unknown>(),
						row: cell.row.original as unknown,
						rowIndex: cell.row.index,
						...(meta?.cell?.config !== undefined ? { config: meta.cell.config } : {}),
					})
				: flexRender(cell.column.columnDef.cell, cell.getContext())}
		</Td>
	)
}

type EditingCellProps = {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	cell: Cell<any, unknown>
	editMode: EditingMode
	cellId: string
	chrome: CellChrome
}

/**
 * Renders the inline edit input for a cell. Only mounted when the parent
 * `BodyDataCell` determines this row/cell is being edited.
 *
 * Each subscription returns a referentially stable value:
 * - `value`: from `editing.values[columnId]` — primitive or stable ref
 * - `errors`: from `editing.errors[columnId]` — `undefined` when no errors
 *   (stable falsy), array when present (stable ref while content unchanged)
 * - `isValidating`: boolean from `commitStatus === CommitStatus.Validating`
 *
 * As a result, `setValue` on a different column does not re-render this cell:
 * only the one whose `values[columnId]` key actually changed re-renders.
 */
function EditingCell({ cell, editMode, cellId, chrome }: EditingCellProps) {
	const table = useDataGridTable()
	const { Td, Input } = useGridComponents().core
	const cellTypes = useCellTypes()
	const columnId = cell.column.id
	const meta = cell.column.columnDef.meta

	const value = useDataGridState((s) => s.editing.values[columnId])
	const rawErrors = useDataGridState((s) => s.editing.errors[columnId])
	const isValidating = useDataGridState((s) => s.editing.commitStatus === CommitStatus.Validating)

	const fieldErrors = rawErrors ?? EMPTY_ERRORS
	const fieldError = fieldErrors[0]

	const editComp = resolveEditComponent(meta, cellTypes)

	const onBlur = () => void table.editing.validateField(columnId)

	// Cell mode has no Save / Cancel pair — the actions column stays out of it — so leaving the
	// cell is the commit, and the keyboard is the deliberate way out: Enter commits, Escape
	// abandons (without which a mis-typed value could not be abandoned at all).
	//
	// All of it is listened for on the document rather than bound to the `Td` or the input: a kit's
	// `Td` need not forward handlers (heroui's wraps react-aria's `Cell`, which drops them) and a
	// custom `editing.component` inherits the behaviour without wiring anything. Only ever one cell
	// edit is open, and this effect lives exactly as long as it does.
	const isCellEdit = editMode === EditingMode.Cell
	useEffect(() => {
		if (!isCellEdit) return undefined

		// `blur` is deliberately NOT the commit trigger. React-aria's grid moves DOM focus from the
		// input to the cell itself on pointer-down, so a blur fires *inside* the cell before the
		// press completes: the switch of a boolean column committed and closed without ever
		// toggling. What ends the edit is the pointer or focus landing somewhere else entirely.
		const isInsideEdit = (target: EventTarget | null): boolean => {
			if (!(target instanceof Element)) return false
			// An overlay belonging to the editor — a select's listbox, a date picker's dialog —
			// renders in a portal outside the cell, so it has to count as inside.
			return target.closest(`[${EDITING_CELL_ATTR}], ${OVERLAY_SELECTOR}`) !== null
		}

		const commitOnLeave = (event: Event): void => {
			if (isInsideEdit(event.target)) return
			void table.editing.commitCell()
		}

		const onKeyDown = (event: globalThis.KeyboardEvent): void => {
			// Already handled by something nearer the user — a select popover closing on Escape.
			if (event.defaultPrevented) return
			if (event.key === 'Enter') {
				event.preventDefault()
				void table.editing.commitCell()
			} else if (event.key === 'Escape') {
				event.preventDefault()
				table.editing.cancel()
			}
		}

		document.addEventListener('keydown', onKeyDown)
		document.addEventListener('pointerdown', commitOnLeave, true)
		document.addEventListener('focusin', commitOnLeave, true)

		// The opened cell takes the caret, so Enter and Escape reach it without a click first. The
		// kit's own edit component is focused here rather than given an `autoFocus` prop, which the
		// cell-type contract does not carry — only the fallback `Input` below ever had one.
		const cellEl = document.querySelector(`[${EDITING_CELL_ATTR}]`)
		if (cellEl && !cellEl.contains(document.activeElement)) {
			cellEl.querySelector<HTMLElement>(FOCUSABLE_SELECTOR)?.focus()
		}

		return () => {
			document.removeEventListener('keydown', onKeyDown)
			document.removeEventListener('pointerdown', commitOnLeave, true)
			document.removeEventListener('focusin', commitOnLeave, true)
		}
	}, [isCellEdit, table])

	const fieldState: FieldState = {
		id: cellId,
		value,
		onChange: (v: unknown) => {
			table.editing.setValue(columnId, v)
		},
		onBlur,
		...(meta?.cell?.config !== undefined ? { config: meta.cell.config } : {}),
		error: fieldError,
		errors: [...fieldErrors],
		isValidating,
	}

	return (
		<Td
			data-slot='td'
			style={chrome.pinVars}
			pinned={chrome.pinned}
			{...chrome.pinnedAttrs}
			{...chrome.alignAttrs}
			{...(fieldError ? { 'data-error': true } : {})}
			{...(isCellEdit ? { [EDITING_CELL_ATTR]: '' } : {})}
		>
			{editComp ? (
				flexRender(editComp, fieldState)
			) : (
				<Input
					value={(value ?? '') as string | number | readonly string[]}
					onChange={(e) => {
						table.editing.setValue(columnId, e.target.value)
					}}
					onBlur={fieldState.onBlur}
				/>
			)}
		</Td>
	)
}

// ── helpers ─────────────────────────────────────────────────────────────────

function getCellChrome(cell: Cell<unknown, unknown>): CellChrome {
	const pinVars = getCommonPinStyles(cell.column)
	const pinned = cell.column.getIsPinned()
	const pinnedAttrs: CellChrome['pinnedAttrs'] = pinned ? { 'data-pinned': pinned } : {}
	return { pinVars, pinned, pinnedAttrs, alignAttrs: getAlignAttrs(cell.column.columnDef.meta, 'cell') }
}

function resolveEditComponent(
	meta: ColumnMeta<unknown, unknown> | undefined,
	registry: CellTypeRegistry,
): ComponentType<FieldState> | undefined {
	// 1. column-level editing.component
	const editingConfig = meta?.editing
	if (editingConfig !== false && editingConfig !== undefined) {
		const comp = editingConfig.component
		if (comp) return comp as ComponentType<FieldState>
	}
	// 2. registry by cell type
	const cellTypeId = meta?.cell?.type
	if (cellTypeId) {
		const def = registry[cellTypeId]
		if (def?.editing) return def.editing
	}
	return undefined
}

/**
 * Resolves the view renderer for a column.
 * - `meta.cell?.view` (set from `cell.component` in mapColumns) takes precedence.
 * - Otherwise, looks up `meta.cell?.type` in the cell-type registry.
 *
 * Returns `undefined` when no renderer is found — the caller falls back to
 * TanStack's default cell rendering (raw value).
 *
 * The headless package ships **no** built-in cell types. Consumers/UI kits
 * register them via `CellTypesProvider` or `createDataGrid({ cellTypes })`.
 */
function resolveViewComponent(
	meta: ColumnMeta<unknown, unknown> | undefined,
	registry: CellTypeRegistry,
): ComponentType<CellViewProps> | undefined {
	// Returned as-is, never wrapped: `flexRender` mounts by component identity, so a wrapper
	// allocated here would be a fresh component type on every render and remount the cell each
	// time. `cell.component` takes `{ row, value, rowIndex }` and simply ignores the extra
	// `config` that `CellViewProps` carries, so the shapes are already compatible.
	if (meta?.cell?.view) return meta.cell.view as ComponentType<CellViewProps>
	const cellTypeId = meta?.cell?.type
	if (cellTypeId) {
		const def = registry[cellTypeId]
		if (def?.view) return def.view
	}
	return undefined
}
