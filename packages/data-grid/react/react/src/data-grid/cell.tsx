import { ACTIONS_COLUMN_ID, EXPAND_COLUMN_ID, SELECTION_COLUMN_ID } from '@ez-kit/data-grid-core'

import { useCellTypes } from '../cell-types-context'
import { useGridComponents } from '../components-context'
import { resolveCellClassName } from '../utils/class-names'
import { getCommonPinStyles } from '../utils/pin-styles'

import { ActionsCell } from './actions-cell'
import { flexRender } from './flex-render'
import { useDataGridTable, useDataGridState } from './table-context'

import type { CellTypeRegistry, CellViewProps } from '../cell-types-context'
import type { FieldState } from '@ez-kit/data-grid-core'
import type { ColumnMeta, Cell, Row } from '@tanstack/table-core'
import type { ComponentType, CSSProperties, ReactNode } from 'react'

/** What a `<DataGrid.Cell>` render function receives. */
export type DataGridCellRenderArgs = {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	cell: Cell<any, unknown>
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	row: Row<any>
	/** The cell's value, already resolved through the column's accessor. */
	value: unknown
}

export type DataGridCellProps = {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	cell: Cell<any, unknown>
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	row: Row<any>
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
	children?: ReactNode | ((args: DataGridCellRenderArgs) => ReactNode)
}

type PinInfo = {
	pinVars: CSSProperties
	pinned: false | 'left' | 'right'
	pinnedAttrs: { 'data-pinned'?: 'left' | 'right' }
}

const EMPTY_ERRORS: readonly string[] = Object.freeze([])

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
export function DataGridCell({ cell, row, children }: DataGridCellProps) {
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
	const pin = getCellPinInfo(cell)
	const cellClassName = resolveCellClassName(meta?.cellClassName, {
		row: row.original as unknown,
		value: cell.getValue<unknown>(),
		rowIndex: row.index,
	})

	return (
		<Td
			data-slot='td'
			style={pin.pinVars}
			pinned={pin.pinned}
			{...pin.pinnedAttrs}
			{...(cellClassName !== undefined ? { className: cellClassName } : {})}
		>
			{typeof children === 'function' ? children({ cell, row, value: cell.getValue<unknown>() }) : children}
		</Td>
	)
}

// ── system columns ──────────────────────────────────────────────────────────

function SystemCell({ cell, row }: DataGridCellProps) {
	const columnId = cell.column.id
	const pin = getCellPinInfo(cell)
	const { Td } = useGridComponents().core

	if (columnId === SELECTION_COLUMN_ID) {
		return (
			<SelectionCell
				row={row}
				pin={pin}
			/>
		)
	}
	if (columnId === EXPAND_COLUMN_ID) {
		return (
			<ExpandCell
				row={row}
				pin={pin}
			/>
		)
	}
	if (columnId === ACTIONS_COLUMN_ID) {
		return (
			<Td
				data-slot='td'
				style={pin.pinVars}
				pinned={pin.pinned}
				{...pin.pinnedAttrs}
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
	pin: PinInfo
}

function SelectionCell({ row, pin }: SystemSubProps) {
	const { Td, Checkbox } = useGridComponents().core
	// Subscribe broadly to rowSelection so row.getIsSelected() / getIsSomeSelected()
	// re-derive correctly. Refining this to per-row keys breaks indeterminate
	// state for parent rows (which depends on children).
	useDataGridState((s) => s.rowSelection)
	const isSelected = row.getIsSelected()
	const isIndeterminate = typeof row.getIsSomeSelected === 'function' ? row.getIsSomeSelected() : undefined
	return (
		<Td
			data-slot='td'
			style={pin.pinVars}
			pinned={pin.pinned}
			{...pin.pinnedAttrs}
		>
			<Checkbox
				value={isSelected}
				{...(isIndeterminate !== undefined ? { indeterminate: isIndeterminate } : {})}
				onChange={() => {
					row.toggleSelected()
				}}
				aria-label='Select row'
			/>
		</Td>
	)
}

function ExpandCell({ row, pin }: SystemSubProps) {
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
			style={pin.pinVars}
			pinned={pin.pinned}
			{...pin.pinnedAttrs}
			data-system-column='expand'
			data-depth={row.depth}
		>
			<Chevron
				expanded={isExpanded}
				onClick={() => {
					row.toggleExpanded()
				}}
				disabled={!canExpand}
			/>
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
	const pin = getCellPinInfo(cell)

	const editMode: 'row' | 'modal' | 'cell' = table.options.editing?.mode ?? 'row'
	const cellId = `${row.id}_${columnId}`

	// Narrow boolean subscription. For non-target rows this remains stably `false`
	// across any `editing` mutation → no re-render. Flips exactly once on
	// start / cancel / commit of THIS row (or cell in cell-mode).
	const isEditing = useDataGridState((s) =>
		editMode === 'cell' ? s.editing.cellId === cellId : s.editing.rowId === row.id,
	)

	if (isEditing && (editMode === 'cell' || meta?.editing !== false)) {
		return (
			<EditingCell
				cell={cell}
				editMode={editMode}
				cellId={cellId}
				pin={pin}
			/>
		)
	}

	// ── normal view cell ───────────────────────────────────────────────────────
	const handleDoubleClick =
		editMode === 'cell'
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
			style={pin.pinVars}
			pinned={pin.pinned}
			{...pin.pinnedAttrs}
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
						...(meta?.config !== undefined ? { config: meta.config } : {}),
					})
				: flexRender(cell.column.columnDef.cell, cell.getContext())}
		</Td>
	)
}

type EditingCellProps = {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	cell: Cell<any, unknown>
	editMode: 'row' | 'modal' | 'cell'
	cellId: string
	pin: PinInfo
}

/**
 * Renders the inline edit input for a cell. Only mounted when the parent
 * `BodyDataCell` determines this row/cell is being edited.
 *
 * Each subscription returns a referentially stable value:
 * - `value`: from `editing.values[columnId]` — primitive or stable ref
 * - `errors`: from `editing.errors[columnId]` — `undefined` when no errors
 *   (stable falsy), array when present (stable ref while content unchanged)
 * - `isValidating`: boolean from `commitStatus === 'validating'`
 *
 * As a result, `setValue` on a different column does not re-render this cell:
 * only the one whose `values[columnId]` key actually changed re-renders.
 */
function EditingCell({ cell, editMode, cellId, pin }: EditingCellProps) {
	const table = useDataGridTable()
	const { Td, Input } = useGridComponents().core
	const cellTypes = useCellTypes()
	const columnId = cell.column.id
	const meta = cell.column.columnDef.meta

	const value = useDataGridState((s) => s.editing.values[columnId])
	const rawErrors = useDataGridState((s) => s.editing.errors[columnId])
	const isValidating = useDataGridState((s) => s.editing.commitStatus === 'validating')

	const fieldErrors = rawErrors ?? EMPTY_ERRORS
	const fieldError = fieldErrors[0]

	const editComp = resolveEditComponent(meta, cellTypes)

	const onBlur =
		editMode === 'cell' ? () => void table.editing.commitCell() : () => void table.editing.validateField(columnId)

	const fieldState: FieldState = {
		id: cellId,
		value,
		onChange: (v: unknown) => {
			table.editing.setValue(columnId, v)
		},
		onBlur,
		...(meta?.config !== undefined ? { config: meta.config } : {}),
		error: fieldError,
		errors: [...fieldErrors],
		isValidating,
	}

	return (
		<Td
			data-slot='td'
			style={pin.pinVars}
			pinned={pin.pinned}
			{...pin.pinnedAttrs}
			{...(fieldError ? { 'data-error': true } : {})}
		>
			{editComp ? (
				flexRender(editComp, fieldState)
			) : (
				<Input
					{...(editMode === 'cell' ? { autoFocus: true } : {})}
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

function getCellPinInfo(cell: Cell<unknown, unknown>): PinInfo {
	const pinVars = getCommonPinStyles(cell.column)
	const pinned = cell.column.getIsPinned()
	const pinnedAttrs: PinInfo['pinnedAttrs'] = pinned ? { 'data-pinned': pinned } : {}
	return { pinVars, pinned, pinnedAttrs }
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
	// 2. registry by cellType
	if (meta?.cellType) {
		const def = registry[meta.cellType]
		if (def?.edit) return def.edit
	}
	return undefined
}

/**
 * Resolves the view renderer for a column.
 * - `meta.cellView` (set from `cell.component` in mapColumns) takes precedence.
 * - Otherwise, looks up `meta.cellType` in the cell-type registry.
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
	if (meta?.cellView) return meta.cellView as ComponentType<CellViewProps>
	if (meta?.cellType) {
		const def = registry[meta.cellType]
		if (def?.view) return def.view
	}
	return undefined
}
