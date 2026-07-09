import { useGridComponents } from '../components-context'
import { SELECTION_BAR_KEY, type SelectionBarCallbackArgs, type SelectionBarConfig } from '../use-data-grid'

import { useTable } from './table-context'

import type { Table } from '@tanstack/table-core'

/**
 * Build the `{ table, clearSelection, selectedRows }` argument passed to every
 * selection-bar callback. Shared with the bulk `ConfirmDialog` renderer so the
 * confirmed handler receives the exact same shape as the instant path.
 */
export function buildSelectionBarArgs(
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	table: Table<any>,
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
): SelectionBarCallbackArgs<any> {
	return {
		table,
		clearSelection: () => {
			table.resetRowSelection()
		},
		selectedRows: table.getSelectedRowModel().rows,
	}
}

/**
 * Selection info bar. Automatically visible when `selection` is enabled
 * and at least one row is selected.
 *
 * Render behaviour:
 * - `selectionBar: false`       → never renders
 * - `selectionBar: undefined`   → renders (no delete button)
 * - `selectionBar: true`        → renders (no delete button)
 * - `selectionBar: { ... }`     → renders with config
 */
export function SelectionBar() {
	const table = useTable()
	const { SelectionBar: SelectionBarComponent } = useGridComponents().selection

	const rawConfig = (table as unknown as Record<symbol, unknown>)[SELECTION_BAR_KEY] as
		| boolean
		| SelectionBarConfig
		| undefined

	const selectionEnabled = Boolean(table.options.enableRowSelection)
	if (!selectionEnabled || rawConfig === false) return null

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const config: SelectionBarConfig<any> = typeof rawConfig === 'object' ? rawConfig : {}

	const callbackArgs = buildSelectionBarArgs(table)
	const { selectedRows } = callbackArgs
	const count = selectedRows.length
	const open = count > 0
	const clearSelection = callbackArgs.clearSelection

	const { onDelete: onDeleteHandler, onClear: onClearHandler } = config

	// When `confirmation` is set, Delete stages a pending bulk delete and the
	// shared ConfirmDialog runs the handler on confirm. Otherwise it fires instantly.
	const onDelete = onDeleteHandler
		? config.confirmation
			? () => {
					table.requestBulkDelete()
				}
			: () => {
					onDeleteHandler(callbackArgs)
				}
		: undefined

	const onClear = onClearHandler
		? () => {
				onClearHandler(callbackArgs)
			}
		: clearSelection

	const actions =
		config.actions == null
			? undefined
			: typeof config.actions === 'function'
				? config.actions(callbackArgs)
				: config.actions

	const variant = config.variant ?? 'floating'

	return (
		<SelectionBarComponent
			open={open}
			count={count}
			selectedRows={selectedRows}
			variant={variant}
			onClear={onClear}
			{...(onDelete !== undefined ? { onDelete } : {})}
			{...(actions !== undefined ? { actions } : {})}
		/>
	)
}
