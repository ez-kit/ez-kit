/* eslint-disable jsx-a11y/no-autofocus */
import { ACTIONS_COLUMN_ID, EXPAND_COLUMN_ID, SELECTION_COLUMN_ID } from '@ez-kit/data-grid-core'

import { useGridComponents } from '../components-context'
import { getCommonPinStyles } from '../utils/pin-styles'

import { ActionsCell } from './actions-cell'
import { flexRender } from './flex-render'
import { useTableContext } from './table-context'

import type { Cell, Row } from '@tanstack/table-core'

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
 */
export function DataGridCell({ cell, row }: CellProps) {
	const table = useTableContext()
	const { Td, Input, Checkbox } = useGridComponents()
	const columnId = cell.column.id
	const meta = cell.column.columnDef.meta
	const pinStyles = getCommonPinStyles(cell.column)

	// ── system columns ────────────────────────────────────────────────────────
	if (meta?.isSystemColumn) {
		if (columnId === SELECTION_COLUMN_ID) {
			const isSelected = row.getIsSelected()
			const isIndeterminate = typeof row.getIsSomeSelected === 'function' ? row.getIsSomeSelected() : undefined
			return (
				<Td style={pinStyles}>
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
				<Td style={pinStyles}>
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
				<Td style={pinStyles}>
					<ActionsCell row={row} />
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
		return (
			<Td style={pinStyles}>
				<Input
					autoFocus
					value={(editingState.editingValues[columnId] ?? '') as string | number | readonly string[]}
					onChange={(e) => {
						table.setEditingValue(columnId, e.target.value)
					}}
					onBlur={() => void table.commitCellEditing()}
				/>
			</Td>
		)
	}

	// ── row editing mode ──────────────────────────────────────────────────────
	const isEditingRow = (editMode === 'row' || editMode === 'modal') && editingState.editingRowId === row.id

	if (isEditingRow && meta?.editing !== false) {
		return (
			<Td style={pinStyles}>
				<Input
					value={(editingState.editingValues[columnId] ?? '') as string | number | readonly string[]}
					onChange={(e) => {
						table.setEditingValue(columnId, e.target.value)
					}}
				/>
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

	return (
		<Td
			style={pinStyles}
			onDoubleClick={handleDoubleClick}
		>
			{flexRender(cell.column.columnDef.cell, cell.getContext() as unknown as Record<string, unknown>)}
		</Td>
	)
}
