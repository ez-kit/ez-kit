import { useGridComponents } from '../components-context'
import { type SelectionPanelCallbackArgs, type SelectionPanelConfig } from '../use-data-grid'

import { resolveSelectionPanelVariant } from './selection-panel-variant'
import { useTable } from './table-context'

import type { Table } from '@tanstack/table-core'

/**
 * Build the `{ table, clearSelection, selectedRows }` argument passed to every
 * selection-panel callback. Shared with the bulk `ConfirmDialog` renderer so the
 * confirmed handler receives the exact same shape as the instant path.
 */
export function buildSelectionPanelArgs(
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	table: Table<any>,
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
): SelectionPanelCallbackArgs<any> {
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
 * Render behaviour (driven by `selection.panel`):
 * - `selection.panel: false`       → never renders
 * - `selection.panel: undefined`   → renders (no delete button)
 * - `selection.panel: true`        → renders (no delete button)
 * - `selection.panel: { ... }`     → renders with config
 */
export function SelectionBar() {
	const table = useTable()
	const { SelectionBar: SelectionBarComponent } = useGridComponents().selection

	// The draft section owns the bar while a query is pending — see DraftBar.
	if (table.options.deferredApply === true && table.draft.isDirty()) return null

	const rawConfig = table.grid.selection.panel

	const selectionEnabled = Boolean(table.options.enableRowSelection)
	if (!selectionEnabled || rawConfig === false) return null

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const config: SelectionPanelConfig<any> = typeof rawConfig === 'object' ? rawConfig : {}

	const callbackArgs = buildSelectionPanelArgs(table)
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

	const variant = resolveSelectionPanelVariant(table)

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
