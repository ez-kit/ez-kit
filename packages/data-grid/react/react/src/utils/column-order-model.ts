import { canMoveColumn, ColumnMoveDirection, ColumnMoveScope } from '@ez-kit/data-grid-core'

import { tableOptionInputs } from '../table-option-inputs'

import { getVisualLeafColumns } from './visual-column-order'

import type { DataTable, GridFeatures } from '../types'

export type ColumnMoveCapabilities = { start: boolean; end: boolean }

type ColumnOrderModel = {
	columns: unknown
	visibility: unknown
	pinning: unknown
	options: object | undefined
	moves: Map<ColumnMoveScope, Map<string, ColumnMoveCapabilities>>
	visualIndices?: Map<string, number>
}

const models = new WeakMap<object, ColumnOrderModel>()

/** Cache only the inputs read by column ordering; unrelated editing/selection writes reuse it.
 * The leaf model includes definition, order and grouping changes. Options are a separate channel.
 */
function modelOf<TRow extends object>(table: DataTable<GridFeatures, TRow>): ColumnOrderModel {
	const columns = table.getAllLeafColumns()
	const { columnVisibility: visibility, columnPinning: pinning } = table.store.state
	const options = tableOptionInputs(table)
	let model = models.get(table)
	if (
		model?.columns !== columns ||
		model.visibility !== visibility ||
		model.pinning !== pinning ||
		model.options !== options
	) {
		model = { columns, visibility, pinning, options, moves: new Map() }
		models.set(table, model)
	}
	return model
}

/** Preserve Core's move rules, evaluating each column/scope only once per relevant model. */
export function getColumnMoveCapabilities<TRow extends object>(
	table: DataTable<GridFeatures, TRow>,
	columnId: string,
	scope: ColumnMoveScope = ColumnMoveScope.Visible,
): ColumnMoveCapabilities {
	const model = modelOf(table)
	let moves = model.moves.get(scope)
	if (!moves) {
		moves = new Map()
		model.moves.set(scope, moves)
	}
	let result = moves.get(columnId)
	if (!result) {
		result = {
			start: canMoveColumn(table, columnId, ColumnMoveDirection.Start, scope),
			end: canMoveColumn(table, columnId, ColumnMoveDirection.End, scope),
		}
		moves.set(columnId, result)
	}
	return result
}

/** One shared visual index map instead of a scan and array allocation per header notification. */
export function getColumnVisualIndex<TRow extends object>(
	table: DataTable<GridFeatures, TRow>,
	columnId: string,
): number {
	const model = modelOf(table)
	model.visualIndices ??= new Map(getVisualLeafColumns(table).map((column, index) => [column.id, index]))
	return model.visualIndices.get(columnId) ?? -1
}
