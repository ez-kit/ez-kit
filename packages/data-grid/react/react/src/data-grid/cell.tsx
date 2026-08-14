import { ACTIONS_COLUMN_ID, EXPAND_COLUMN_ID, SELECTION_COLUMN_ID } from '@ez-kit/data-grid-core'

import { useCellTypes } from '../cell-types-context'
import { useGridComponents } from '../components-context'
import { getCommonPinStyles } from '../utils/pin-styles'

import { ActionsCell } from './actions-cell'
import { flexRender } from './flex-render'
import { useDataGridInstance, useDataGridStore } from './table-context'

import type { CellTypeRegistry, CellViewProps } from '../cell-types-context'
import type { FieldState } from '@ez-kit/data-grid-core'
import type { ColumnMeta, Cell, Row } from '@tanstack/table-core'
import type { CSSProperties, ReactNode } from 'react'

type CellProps = {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	cell: Cell<any, unknown>
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	row: Row<any>
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
export function DataGridCell({ cell, row }: CellProps) {
	const meta = cell.column.columnDef.meta
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

// ── system columns ──────────────────────────────────────────────────────────

function SystemCell({ cell, row }: CellProps) {
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
	useDataGridStore((s) => s.rowSelection)
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
	useDataGridStore((s) => s.expanded)
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

function BodyDataCell({ cell, row }: CellProps) {
	const instance = useDataGridInstance()
	const table = instance.table
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
	const isEditing = useDataGridStore((s) =>
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

	return (
		<Td
			data-slot='td'
			style={pin.pinVars}
			pinned={pin.pinned}
			{...pin.pinnedAttrs}
			onDoubleClick={handleDoubleClick}
		>
			{viewComp
				? viewComp({
						value: cell.getValue(),
						row: cell.row.original,
						rowIndex: cell.row.index,
						...(meta?.config !== undefined ? { config: meta.config } : {}),
					})
				: flexRender(cell.column.columnDef.cell, cell.getContext() as unknown as Record<string, unknown>)}
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
	const instance = useDataGridInstance()
	const table = instance.table
	const { Td, Input } = useGridComponents().core
	const cellTypes = useCellTypes()
	const columnId = cell.column.id
	const meta = cell.column.columnDef.meta

	const value = useDataGridStore((s) => s.editing.values[columnId])
	const rawErrors = useDataGridStore((s) => s.editing.errors[columnId])
	const isValidating = useDataGridStore((s) => s.editing.commitStatus === 'validating')

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
				editComp(fieldState)
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
): ((props: FieldState) => ReactNode) | undefined {
	// 1. column-level editing.component
	const editingConfig = meta?.editing
	if (editingConfig !== false && editingConfig !== undefined) {
		const comp = editingConfig.component
		if (comp) return comp as (props: FieldState) => ReactNode
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
): ((props: CellViewProps) => ReactNode) | undefined {
	if (meta?.cellView) {
		const cellView = meta.cellView
		return (props: CellViewProps) =>
			cellView({ row: props.row, value: props.value, rowIndex: props.rowIndex }) as ReactNode
	}
	if (meta?.cellType) {
		const def = registry[meta.cellType]
		if (def?.view) return def.view
	}
	return undefined
}
