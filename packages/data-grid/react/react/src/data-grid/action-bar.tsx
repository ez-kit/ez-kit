import { isFeatureEnabled } from '@ez-kit/data-grid-core'

import { useGridComponents } from '../components-context'
import { type SelectionBarCallbackArgs } from '../use-data-grid'

import { resolveActionBarVariant } from './action-bar-variant'
import { buildActionItems } from './build-action-items'
import { useDataGridState, useDataGridTable } from './table-context'

import type {
	ActionBarDraftSection,
	ActionBarSelectionSection,
	ActionBarVariant,
	DataTable,
	ErasedRow,
	GridFeatures,
} from '../types'
import type { Table } from '@tanstack/table-core'
import type { ReactNode } from 'react'

/**
 * Build the `{ table, clearSelection, selectedRows }` argument passed to every selection
 * callback. Shared with the bulk `ConfirmDialog` renderer so the prompt describes the exact
 * set the handler will receive.
 */
export function buildSelectionBarArgs<TRow extends object>(
	table: Table<GridFeatures, TRow>,
): SelectionBarCallbackArgs<TRow> {
	return {
		table,
		clearSelection: () => {
			table.resetRowSelection()
		},
		selectedRows: table.getSelectedRowModel().rows,
	}
}

/**
 * What a `<DataGrid.ActionBar>` render function receives — the kit component's props, with the
 * selection section widened by the callback args a hand-rolled bar needs.
 *
 * `selection.onDelete` is the reason this is worth exposing: it already encodes the
 * confirmation protocol. With `deleting.bulk.confirmation` set it stages a pending bulk delete
 * and the shared `ConfirmDialog` runs the handler on confirm; without it the delete runs
 * outright. A hand-rolled bar that reached for the configured handler directly would silently
 * skip the prompt.
 */
export type DataGridActionBarRenderArgs<TRow extends object = ErasedRow> = {
	/** False when neither section has anything to show — animate out rather than unmounting. */
	open: boolean
	/** Resolved render mode — `'floating'` or `'inline'`. */
	variant: ActionBarVariant
	/** Absent when selection is off, `bar: false`, or no selection feature is registered. */
	selection?: ActionBarSelectionSection & SelectionBarCallbackArgs<TRow>
	/** Absent when `draft` is off or the draft is clean. */
	draft?: ActionBarDraftSection
}

export type DataGridActionBarProps = {
	/**
	 * Extra markup rendered at the start of the selection section's controls, before the
	 * built-in Delete.
	 *
	 * The additive escape hatch, mirroring `<DataGrid.Toolbar>`: `children` replaces the bar,
	 * `start` / `end` add to the kit's. Use it for content that is not an action — a
	 * bulk-target select, a counter; a plain action belongs in `selection.bar.actions`, where
	 * the kit draws it.
	 *
	 * They feed the **selection section**, not the bar's two ends: their documented purpose is
	 * content about the selection, and the draft section has a fixed shape. Naming them for the
	 * bar while they feed one section is the smaller of the two confusions.
	 *
	 * `start` / `end`, not `left` / `right`: the bar is a flex row, so its two ends swap under
	 * RTL — same rule as the toolbar's slots and a column's `align`.
	 */
	start?: ReactNode
	/** See {@link DataGridActionBarProps.start}. Rendered after the custom actions. */
	end?: ReactNode
	/**
	 * Custom bar content, replacing the kit's `ActionBar` component.
	 *
	 * Nothing is rendered — `children` included — while both sections are absent, so a custom
	 * bar never appears with nothing to act on. `open` is passed through rather than gating, so
	 * a custom bar can animate its own enter/exit instead of unmounting.
	 *
	 * @example
	 * ```tsx
	 * <DataGrid.ActionBar>
	 *   {({ open, selection, draft }) =>
	 *     open ? (
	 *       <div>
	 *         {selection && <span>{selection.count} selected</span>}
	 *         {selection?.onDelete && <button onClick={selection.onDelete}>Delete</button>}
	 *         {draft && <button onClick={draft.onApply}>Apply</button>}
	 *       </div>
	 *     ) : null
	 *   }
	 * </DataGrid.ActionBar>
	 * ```
	 */
	children?: ReactNode | ((args: DataGridActionBarRenderArgs) => ReactNode)
}

/**
 * The grid's one action bar, with a live section per concern: the current selection, and the
 * pending draft.
 *
 * It is **one** component on purpose. The two sections used to be two components, each drawing
 * a whole bar and kept apart by a `return null` in the selection one — a gate that only re-ran
 * when `rowSelection` changed. A draft edit changes no `rowSelection`, so the gate never ran
 * and both bars mounted at the same sticky position. Two pieces of chrome that pretend to be
 * one bar can only stay consistent while every gate that hides one of them re-runs in lockstep
 * with the other, so a subscription fix would only have postponed the next instance of it.
 *
 * Hence the deliberately broad `useDataGridState((s) => s)`: the bar re-renders on any state
 * change, which is what a single surface over two independent concerns costs, and the bar is
 * one small subtree. A narrow subscription is exactly what caused the bug.
 *
 * Both sections are live at once: the selection is valid against the **applied** query, which
 * is what the user is looking at, and the set only goes stale after Apply — which
 * `table.draft.apply()` already handles by clearing the selection in the same state change.
 */
export function ActionBar({ children, start, end }: DataGridActionBarProps = {}) {
	const table = useDataGridTable()
	// Deliberately broad, and it is also the read: `draft.isDirty()` spans sorting, column
	// filters, global search and `applied`, the selection section reads `rowSelection`, and v9's
	// whole-snapshot `getState()` is gone — this snapshot is the object the selector returned.
	useDataGridState((s) => s)
	const { ActionBar: ActionBarComponent } = useGridComponents().core

	const selection = buildSelectionSection(table, start, end)
	const draft = buildDraftSection(table)
	const variant = resolveActionBarVariant(table)
	// A `selection` section with `count: 0` is normal while a floating bar animates out, so
	// `open` asks what there is to act on rather than which sections exist.
	const open = (selection?.count ?? 0) > 0 || draft !== undefined

	if (selection === undefined && draft === undefined) return null

	const sections = {
		...(selection !== undefined ? { selection } : {}),
		...(draft !== undefined ? { draft } : {}),
	}

	if (children !== undefined) {
		return typeof children === 'function' ? children({ open, variant, ...sections }) : children
	}

	return (
		<ActionBarComponent
			open={open}
			variant={variant}
			{...sections}
		/>
	)
}

/**
 * The selection half, or `undefined` when there is no selection to act on.
 *
 * `table.grid.selection.bar` is resolved by `useDataGrid`: `undefined` already means "no bar" —
 * selection off, `bar: false` or `bar: { enabled: false }` — so nothing is re-derived here.
 */
function buildSelectionSection(
	table: DataTable<GridFeatures, ErasedRow>,
	start: ReactNode,
	end: ReactNode,
): (ActionBarSelectionSection & SelectionBarCallbackArgs) | undefined {
	const config = table.grid.selection.bar
	if (config === undefined || !table.options.enableRowSelection) return undefined

	const callbackArgs = buildSelectionBarArgs(table)
	const { selectedRows } = callbackArgs
	const { onClear: onClearHandler } = config

	// One entry point for both paths: `deleting.bulk.request` stages a pending delete when
	// `deleting.bulk.confirmation` is set and runs it outright otherwise, so the bar never has
	// to know which of the two it is looking at.
	const onDelete =
		table.options.deleting !== undefined && isFeatureEnabled(table.options.deleting.bulk)
			? () => {
					table.deleting.bulk.request()
				}
			: undefined

	// The grid always clears — the handler is told what was selected, never asked to finish
	// the job. `callbackArgs` is built above, so `selectedRows` is still the pre-reset set.
	const onClear = () => {
		callbackArgs.clearSelection()
		onClearHandler?.(callbackArgs)
	}

	const actions = config.actions ? buildActionItems(config.actions(callbackArgs)) : undefined

	return {
		...callbackArgs,
		count: selectedRows.length,
		selectedRows,
		onClear,
		...(onDelete !== undefined ? { onDelete } : {}),
		...(actions !== undefined ? { actions } : {}),
		...(start !== undefined ? { start } : {}),
		...(end !== undefined ? { end } : {}),
	}
}

/** The pending-draft half, or `undefined` when `draft` is off or the draft is clean. */
function buildDraftSection(table: DataTable<GridFeatures, ErasedRow>): ActionBarDraftSection | undefined {
	if (table.options.draft !== true || !table.draft.isDirty()) return undefined

	return {
		pending: table.draft.getPendingCount(),
		onApply: () => {
			table.draft.apply()
		},
		onReset: () => {
			table.draft.reset()
		},
	}
}
