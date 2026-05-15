/* eslint-disable jsx-a11y/no-autofocus */
import { ACTIONS_COLUMN_ID, EXPAND_COLUMN_ID, ROW_PIN_COLUMN_ID, SELECTION_COLUMN_ID } from '@ez-kit/data-grid-core'

import { useCellTypes } from '../cell-types-context'
import { useGridComponents } from '../components-context'
import { getCommonPinStyles } from '../utils/pin-styles'

import { ActionsCell } from './actions-cell'
import { flexRender } from './flex-render'
import { RowPinCell } from './row-pin-cell'
import { useTable } from './table-context'

import type { CellTypeRegistry, CellViewProps } from '../cell-types-context'
import type { FieldState } from '@ez-kit/data-grid-core'
import type { ColumnMeta, Cell, Row } from '@tanstack/table-core'
import type { ReactNode } from 'react'

type CellProps = {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	cell: Cell<any, unknown>
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	row: Row<any>
}

/**
 * Renders a single table body cell.
 *
 * Emits `data-slot="td"` plus `data-pinned="left" | "right"` for pinned columns;
 * pin offsets are written as CSS custom properties via {@link getCommonPinStyles}.
 * The structural stylesheet shipped with this package applies the actual
 * `position: sticky` + offsets.
 *
 * - System cells (selection / expand / actions / row-pin) have dedicated renderers.
 * - In `editing.mode = 'cell'`: double-click enters edit mode, blur commits the cell.
 * - Editing row (row/modal mode): renders an input instead of static value.
 * - Edit/creating renderers receive a {@link FieldState} with `error` / `errors` / `onBlur` / `isValidating`.
 * - View renderers receive `config` (from `column.config` / `meta.config`).
 */
export function DataGridCell({ cell, row }: CellProps) {
	const table = useTable()
	const { Td, Input, Checkbox, Chevron } = useGridComponents()
	const cellTypes = useCellTypes()
	const columnId = cell.column.id
	const meta = cell.column.columnDef.meta
	const pinVars = getCommonPinStyles(cell.column)
	const pinned = cell.column.getIsPinned()
	const pinnedAttrs = pinned ? { 'data-pinned': pinned } : {}

	// ── system columns ────────────────────────────────────────────────────────
	if (meta?.isSystemColumn) {
		if (columnId === SELECTION_COLUMN_ID) {
			const isSelected = row.getIsSelected()
			const isIndeterminate = typeof row.getIsSomeSelected === 'function' ? row.getIsSomeSelected() : undefined
			return (
				<Td data-slot='td' style={pinVars} pinned={pinned} {...pinnedAttrs}>
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

		if (columnId === EXPAND_COLUMN_ID) {
			const canExpand = row.getCanExpand()
			const isExpanded = row.getIsExpanded()
			return (
				<Td
					data-slot='td'
					style={pinVars}
					pinned={pinned}
					{...pinnedAttrs}
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

		if (columnId === ACTIONS_COLUMN_ID) {
			return (
				<Td data-slot='td' style={pinVars} pinned={pinned} {...pinnedAttrs}>
					<ActionsCell row={row} />
				</Td>
			)
		}

		if (columnId === ROW_PIN_COLUMN_ID) {
			return (
				<Td data-slot='td' style={pinVars} pinned={pinned} {...pinnedAttrs}>
					<RowPinCell row={row} />
				</Td>
			)
		}
	}

	// ── cell editing mode ─────────────────────────────────────────────────────
	const editingState = table.editing.getState()
	const editMode = table.options.editing?.mode ?? 'row'
	const cellId = `${row.id}_${columnId}`
	const isEditingThisCell = editMode === 'cell' && editingState.cellId === cellId

	const fieldErrors = editingState.errors[columnId] ?? []
	const fieldError = fieldErrors[0]
	const isValidating = editingState.commitStatus === 'validating'

	if (isEditingThisCell) {
		const editComp = resolveEditComponent(meta, cellTypes)
		const value = editingState.values[columnId]
		const onChange = (v: unknown): void => {
			table.editing.setValue(columnId, v)
		}
		const fieldState: FieldState = {
			id: cellId,
			value,
			onChange,
			onBlur: () => void table.editing.commitCell(),
			...(meta?.config !== undefined ? { config: meta.config } : {}),
			error: fieldError,
			errors: fieldErrors,
			isValidating,
		}
		return (
			<Td
				data-slot='td'
				style={pinVars}
				pinned={pinned}
				{...pinnedAttrs}
				{...(fieldError ? { 'data-error': true } : {})}
			>
				{editComp ? (
					editComp(fieldState)
				) : (
					<Input
						autoFocus
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

	// ── row editing mode ──────────────────────────────────────────────────────
	const isEditingRow = editMode === 'row' && editingState.rowId === row.id

	if (isEditingRow && meta?.editing !== false) {
		const editComp = resolveEditComponent(meta, cellTypes)
		const value = editingState.values[columnId]
		const onChange = (v: unknown): void => {
			table.editing.setValue(columnId, v)
		}
		const fieldState: FieldState = {
			id: cellId,
			value,
			onChange,
			onBlur: () => void table.editing.validateField(columnId),
			...(meta?.config !== undefined ? { config: meta.config } : {}),
			error: fieldError,
			errors: fieldErrors,
			isValidating,
		}
		return (
			<Td
				data-slot='td'
				style={pinVars}
				pinned={pinned}
				{...pinnedAttrs}
				{...(fieldError ? { 'data-error': true } : {})}
			>
				{editComp ? (
					editComp(fieldState)
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

	// ── normal cell ───────────────────────────────────────────────────────────
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
			style={pinVars}
			pinned={pinned}
			{...pinnedAttrs}
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

// ── helpers ───────────────────────────────────────────────────────────────

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
