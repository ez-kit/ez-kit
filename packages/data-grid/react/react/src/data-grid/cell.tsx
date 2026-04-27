/* eslint-disable jsx-a11y/no-autofocus */
import { ACTIONS_COLUMN_ID, EXPAND_COLUMN_ID, ROW_PIN_COLUMN_ID, SELECTION_COLUMN_ID } from '@ez-kit/data-grid-core'

import { useCellTypes } from '../cell-types-context'
import { useGridComponents } from '../components-context'
import { getCommonPinStyles, isBoundaryPinnedColumn } from '../utils/pin-styles'

import { ActionsCell } from './actions-cell'
import { flexRender } from './flex-render'
import { RowPinCell } from './row-pin-cell'
import { useTableContext } from './table-context'

import type { CellInputProps, CellTypeRegistry, CellViewProps } from '../cell-types-context'
import type { CellViewCtx } from '@ez-kit/data-grid-core'
import type { ColumnMeta, Cell, Row } from '@tanstack/table-core'
import type { CSSProperties, ReactNode } from 'react'

interface CellProps {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	cell: Cell<any, unknown>
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	row: Row<any>
}

/**
 * Renders a single table body cell.
 * - System cells (selection / expand / actions) have dedicated renderers.
 * - In `editing.mode = 'cell'`: double-click enters edit mode, blur commits.
 * - Editing row (row/modal mode): renders an input instead of static value.
 * - Supports `cell.component`, `editing.component`, and `CellTypeRegistry` for DI.
 */
export function DataGridCell({ cell, row }: CellProps) {
	const table = useTableContext()
	const { Td, Input, Checkbox } = useGridComponents()
	const cellTypes = useCellTypes()
	const columnId = cell.column.id
	const meta = cell.column.columnDef.meta
	const pinStyles = getCommonPinStyles(cell.column, isBoundaryPinnedColumn(cell.column, table))
	const cellStyle: CSSProperties = pinStyles

	// ── system columns ────────────────────────────────────────────────────────
	if (meta?.isSystemColumn) {
		if (columnId === SELECTION_COLUMN_ID) {
			const isSelected = row.getIsSelected()
			const isIndeterminate = typeof row.getIsSomeSelected === 'function' ? row.getIsSomeSelected() : undefined
			return (
				<Td style={cellStyle}>
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
			return (
				<Td style={cellStyle}>
					{row.getCanExpand() && (
						<button
							type='button'
							onClick={() => {
								row.toggleExpanded()
							}}
							aria-label={row.getIsExpanded() ? 'Collapse' : 'Expand'}
						>
							{row.getIsExpanded() ? '▼' : '▶'}
						</button>
					)}
				</Td>
			)
		}

		if (columnId === ACTIONS_COLUMN_ID) {
			return (
				<Td style={cellStyle}>
					<ActionsCell row={row} />
				</Td>
			)
		}

		if (columnId === ROW_PIN_COLUMN_ID) {
			return (
				<Td style={cellStyle}>
					<RowPinCell row={row} />
				</Td>
			)
		}
	}

	// ── cell editing mode ─────────────────────────────────────────────────────
	const editingState = table.getEditingState()
	const editMode = table.options.editing?.mode ?? 'row'
	const cellId = `${row.id}_${columnId}`
	const isEditingThisCell = editMode === 'cell' && editingState.editingCellId === cellId

	if (isEditingThisCell) {
		const editComp = resolveEditComponent(meta, cellTypes)
		const value = editingState.editingValues[columnId]
		const onChange = (v: unknown) => {
			table.setEditingValue(columnId, v)
		}
		return (
			<Td style={cellStyle}>
				{editComp ? (
					editComp({ value, onChange, ...(meta?.config !== undefined ? { config: meta.config } : {}) })
				) : (
					<Input
						autoFocus
						value={(value ?? '') as string | number | readonly string[]}
						onChange={(e) => {
							table.setEditingValue(columnId, e.target.value)
						}}
						onBlur={() => void table.commitCellEditing()}
					/>
				)}
			</Td>
		)
	}

	// ── row editing mode ──────────────────────────────────────────────────────
	const isEditingRow = (editMode === 'row' || editMode === 'modal') && editingState.editingRowId === row.id

	if (isEditingRow && meta?.editing !== false) {
		const editComp = resolveEditComponent(meta, cellTypes)
		const value = editingState.editingValues[columnId]
		const onChange = (v: unknown) => {
			table.setEditingValue(columnId, v)
		}
		return (
			<Td style={cellStyle}>
				{editComp ? (
					editComp({ value, onChange, ...(meta?.config !== undefined ? { config: meta.config } : {}) })
				) : (
					<Input
						value={(value ?? '') as string | number | readonly string[]}
						onChange={(e) => {
							table.setEditingValue(columnId, e.target.value)
						}}
					/>
				)}
			</Td>
		)
	}

	// ── normal cell ───────────────────────────────────────────────────────────
	const handleDoubleClick =
		editMode === 'cell'
			? () => {
					table.startCellEditing(row.id, columnId)
				}
			: undefined

	const viewComp = resolveViewComponent(meta, cellTypes)

	return (
		<Td
			style={cellStyle}
			onDoubleClick={handleDoubleClick}
		>
			{viewComp
				? viewComp({ value: cell.getValue(), row: cell.row.original, rowIndex: cell.row.index, ...(meta?.config !== undefined ? { config: meta.config } : {}) })
				: flexRender(cell.column.columnDef.cell, cell.getContext() as unknown as Record<string, unknown>)}
		</Td>
	)
}

// ── helpers ───────────────────────────────────────────────────────────────

function resolveEditComponent(
	meta: ColumnMeta<unknown, unknown> | undefined,
	registry: CellTypeRegistry,
): ((props: CellInputProps) => ReactNode) | undefined {
	// 1. column-level editing.component
	const editingConfig = meta?.editing
	if (editingConfig !== false && editingConfig !== undefined) {
		const comp = editingConfig.component
		if (comp) return comp as (props: CellInputProps) => ReactNode
	}
	// 2. registry by cellType
	if (meta?.cellType) {
		const def = registry[meta.cellType]
		if (def?.edit) return def.edit
	}
	return undefined
}

function resolveViewComponent(
	meta: ColumnMeta<unknown, unknown> | undefined,
	registry: CellTypeRegistry,
): ((props: CellViewProps) => ReactNode) | undefined {
	// 1. meta.cellView set from cell.component / cell.view in mapColumns
	if (meta?.cellView) {
		const cellView = meta.cellView
		return (props: CellViewProps) =>
			cellView({ row: props.row, value: props.value, rowIndex: props.rowIndex } as CellViewCtx<
				unknown,
				unknown
			>) as ReactNode
	}
	// 2. registry by cellType
	if (meta?.cellType) {
		const def = registry[meta.cellType]
		if (def?.view) return def.view
		// 3. built-in type rendering
		return builtInView(meta.cellType)
	}
	return undefined
}

function BooleanCell({ value }: CellViewProps) {
	return <>{value ? '✓' : '✗'}</>
}

function NumberCell({ value }: CellViewProps) {
	const display = typeof value === 'number' ? value.toLocaleString() : String(value ?? '')
	return <>{display}</>
}

function DateCell({ value }: CellViewProps) {
	if (value == null) return null
	const str = String(value)
	const d = value instanceof Date ? value : new Date(str)
	return <>{isNaN(d.getTime()) ? str : d.toLocaleDateString()}</>
}

function builtInView(cellType: string): ((props: CellViewProps) => ReactNode) | undefined {
	if (cellType === 'boolean') return BooleanCell
	if (cellType === 'number') return NumberCell
	if (cellType === 'date') return DateCell
	return undefined
}
