import { useGridComponents } from '../components-context'
import {
	type SelectionPanelCallbackArgs,
	type SelectionPanelConfig,
	type SelectionPanelVariant,
} from '../use-data-grid'

import { resolveSelectionPanelVariant } from './selection-panel-variant'
import { useTable } from './table-context'

import type { Table } from '@tanstack/table-core'
import type { ReactElement, ReactNode } from 'react'

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
/**
 * What a `<DataGrid.SelectionBar>` render function receives.
 *
 * `onDelete` is the reason this is worth exposing: it already encodes the confirmation
 * protocol. With `panel.confirmation` set it stages a pending bulk delete and the shared
 * `ConfirmDialog` runs the handler on confirm; without it the handler fires immediately. A
 * hand-rolled bar that called `panel.onDelete` directly would silently skip the prompt.
 */
export type DataGridSelectionBarRenderArgs<TRow extends object = object> = SelectionPanelCallbackArgs<TRow> & {
	/** Number of selected rows. */
	count: number
	/** Whether the bar would normally be shown — i.e. at least one row is selected. */
	open: boolean
	/** Confirmation-aware delete. Absent when the panel has no `onDelete`. */
	onDelete?: (() => void) | undefined
	/** Runs the panel's `onClear` when set, otherwise resets the selection. */
	onClear: () => void
	/** Resolved `actions` slot content, if the panel config supplied one. */
	actions?: ReactElement | undefined
	/** Resolved render mode — `'floating'` or `'inline'`. */
	variant: SelectionPanelVariant
}

export type DataGridSelectionBarProps = {
	/**
	 * Custom bar content, replacing the kit's `SelectionBar` component.
	 *
	 * The gates that hide the bar still apply — selection disabled, `panel: false`, or the
	 * draft bar owning the slot while a deferred query is pending — so `children` are not
	 * rendered in those states. `open` is passed through rather than gating, so a custom bar
	 * can animate its own enter/exit instead of unmounting.
	 *
	 * @example
	 * ```tsx
	 * <DataGrid.SelectionBar>
	 *   {({ count, open, onDelete, onClear }) =>
	 *     open ? (
	 *       <div>
	 *         {count} selected
	 *         {onDelete && <button onClick={onDelete}>Delete</button>}
	 *         <button onClick={onClear}>Cancel</button>
	 *       </div>
	 *     ) : null
	 *   }
	 * </DataGrid.SelectionBar>
	 * ```
	 */
	children?: ReactNode | ((args: DataGridSelectionBarRenderArgs) => ReactNode)
}

export function SelectionBar({ children }: DataGridSelectionBarProps = {}) {
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

	if (children !== undefined) {
		return typeof children === 'function'
			? children({
					...callbackArgs,
					count,
					open,
					onDelete,
					onClear,
					actions,
					variant,
				})
			: children
	}

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
