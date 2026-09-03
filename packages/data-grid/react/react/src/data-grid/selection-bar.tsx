import { isFeatureEnabled } from '@ez-kit/data-grid-core'

import { useGridComponents } from '../components-context'
import { type SelectionBarCallbackArgs, type ActionBarVariant } from '../use-data-grid'

import { resolveActionBarVariant } from './action-bar-variant'
import { buildActionItems } from './build-action-items'
import { useDataGridState, useDataGridTable } from './table-context'

import type { GridMenuItem } from '../menu'
import type { Table } from '@tanstack/table-core'
import type { ReactNode } from 'react'

/**
 * Build the `{ table, clearSelection, selectedRows }` argument passed to every selection-bar
 * callback. Shared with the bulk `ConfirmDialog` renderer so the prompt describes the exact
 * set the handler will receive.
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
 * What a `<DataGrid.SelectionBar>` render function receives.
 *
 * `onDelete` is the reason this is worth exposing: it already encodes the confirmation
 * protocol. With `deleting.bulk.confirmation` set it stages a pending bulk delete and the
 * shared `ConfirmDialog` runs the handler on confirm; without it the delete runs immediately.
 * A hand-rolled bar that reached for the handler directly would silently skip the prompt.
 */
export type DataGridSelectionBarRenderArgs<TRow extends object = object> = SelectionBarCallbackArgs<TRow> & {
	/** Number of selected rows. */
	count: number
	/** Whether the bar would normally be shown — i.e. at least one row is selected. */
	open: boolean
	/** Confirmation-aware bulk delete. Absent when `deleting.bulk` is off. */
	onDelete?: (() => void) | undefined
	/** Runs the bar's `clear` when set, otherwise resets the selection. */
	onClear: () => void
	/**
	 * `selection.bar.actions` resolved against this selection, in the menu model a kit renders
	 * — icons resolved, ids namespaced. Absent when the config supplied no callback.
	 */
	actions?: GridMenuItem[] | undefined
	/** Resolved render mode — `'floating'` or `'inline'`. */
	variant: ActionBarVariant
}

export type DataGridSelectionBarProps = {
	/**
	 * Extra markup rendered at the start of the bar's controls, before the built-in Delete.
	 *
	 * The additive escape hatch, mirroring `<DataGrid.Toolbar>`: `children` replaces the bar,
	 * `start` / `end` add to the kit's. Use it for content that is not an action — a
	 * bulk-target select, a counter; a plain action belongs in `selection.bar.actions`, where
	 * the kit draws it.
	 *
	 * `start` / `end`, not `left` / `right`: the bar is a flex row, so its two ends swap under
	 * RTL — same rule as the toolbar's slots and a column's `align`.
	 */
	start?: ReactNode
	/** See {@link DataGridSelectionBarProps.start}. Rendered after the custom actions. */
	end?: ReactNode
	/**
	 * Custom bar content, replacing the kit's `SelectionBar` component.
	 *
	 * The gates that hide the bar still apply — selection disabled, `bar: false`, or the
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

export function SelectionBar({ children, start, end }: DataGridSelectionBarProps = {}) {
	const table = useDataGridTable()
	useDataGridState((s) => s.rowSelection)
	const { SelectionBar: SelectionBarComponent } = useGridComponents().selection

	// The draft section owns the bar while a query is pending — see DraftBar.
	if (table.options.draft === true && table.draft.isDirty()) return null

	// Resolved by `useDataGrid`: `undefined` already means "no bar" — selection off, `bar: false`
	// or `bar: { enabled: false }` — so nothing is re-derived here.
	const config = table.grid.selection.bar
	if (config === undefined || !table.options.enableRowSelection) return null

	const callbackArgs = buildSelectionBarArgs(table)
	const { selectedRows } = callbackArgs
	const count = selectedRows.length
	const open = count > 0
	const clearSelection = callbackArgs.clearSelection

	const { clear: clearHandler } = config

	// One entry point for both paths: `deleting.bulk.request` stages a pending delete when
	// `deleting.bulk.confirmation` is set and runs it outright otherwise, so the bar never has
	// to know which of the two it is looking at.
	const onDelete =
		table.options.deleting !== undefined && isFeatureEnabled(table.options.deleting.bulk)
			? () => {
					table.deleting.bulk.request()
				}
			: undefined

	const onClear = clearHandler
		? () => {
				clearHandler(callbackArgs)
			}
		: clearSelection

	const actions = config.actions ? buildActionItems(config.actions(callbackArgs)) : undefined

	const variant = resolveActionBarVariant(table)

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
			{...(start !== undefined ? { start } : {})}
			{...(end !== undefined ? { end } : {})}
		/>
	)
}
