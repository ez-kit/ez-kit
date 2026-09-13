import { applyRowOrder } from './apply-row-order'
import { applyRowMove, moveRow } from './row-ordering'

import type { RowMoveDirection } from './row-ordering'
import type { RowOrderingConfig } from '../../types'
// Re-exported so `index.ts` can source `RowOrderState` from this module. That pulls this file
// (and its `declare module '@tanstack/table-core'` augmentation for `state.rowOrder`) into the
// bundled `.d.ts` — otherwise rollup-dts drops the augmentation and downstream packages lose
// the types. Same reason `loading.ts` re-exports `LoadingState`.
import type { InitialTableState, RowData, Table, TableFeature, TableState } from '@tanstack/table-core'

/**
 * The user's row order, as row ids.
 *
 * Empty until the first move — an untouched grid renders `data` exactly as given — and
 * complete from then on, the same rule `columnOrder` follows. See `applyRowOrder` for what a
 * row absent from it does.
 */
export type RowOrderState = string[]

declare module '@tanstack/table-core' {
	// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
	interface TableState {
		rowOrder: RowOrderState
	}

	// eslint-disable-next-line @typescript-eslint/consistent-type-definitions, @typescript-eslint/no-unused-vars
	interface TableOptionsResolved<TData extends RowData> {
		/**
		 * The resolved row half of `ordering`, or absent when the axis is off.
		 *
		 * Its own key rather than the public `ordering` object: every gate — `ordering: true`
		 * meaning columns only, `enabled: false`, the axis being named — is resolved once in
		 * `createTable`, so presence here is the whole answer to "is row reordering on".
		 */
		rowOrdering?: RowOrderingConfig
	}

	// eslint-disable-next-line @typescript-eslint/consistent-type-definitions, @typescript-eslint/no-unused-vars
	interface Table<TData extends RowData> {
		/** Row reordering, driven by the row menu's move entries and by `Alt+Arrow`. */
		ordering: RowOrderingApi
	}
}

export type RowOrderingApi = {
	/** Whether this step is available — what a menu entry's disabled state reads. */
	canMoveRow: (rowId: string, direction: RowMoveDirection) => boolean
	/** Take one step, if it is available. A no-op otherwise. */
	moveRow: (rowId: string, direction: RowMoveDirection) => void
}

/**
 * Whether the uncontrolled order can express a move of this row at all.
 *
 * It cannot for a sub-row: the order is a list of ids over the top-level `data` array, and a
 * child's position lives inside its parent's row object, which reordering `data` never touches.
 * The move would be recorded and then render identically — a menu entry that does nothing.
 *
 * Controlled mode has no such limit. The application owns the data there, so it can splice a
 * child list as readily as a top-level one, and the move is reported exactly as made.
 */
function isTopLevelRow(table: Table<RowData>, rowId: string): boolean {
	const row = table.getCoreRowModel().rowsById[rowId]
	return row === undefined || row.depth === 0
}

/**
 * The row half of `ordering`, as a TanStack feature.
 *
 * Owns the `rowOrder` slice and the one writer that touches it. The mode is read per call
 * rather than captured at construction, because the React adapter re-syncs `rowOrdering` on
 * every render so that an inline `onChange` is never the closure from first mount.
 *
 * Note the feature owns the order but does **not** apply it: rendering rows in a new order
 * means reordering `data`, which belongs to whoever owns the render loop. `applyRowOrder` is
 * exported for exactly that, and the React adapter calls it.
 */
export const RowOrderingFeature: TableFeature<RowData> = {
	getInitialState: (state?: InitialTableState) =>
		({
			...state,
			rowOrder: (state as Partial<TableState> | undefined)?.rowOrder ?? [],
		}) as Partial<TableState>,

	createTable: (table: Table<RowData>) => {
		table.ordering = {
			canMoveRow: (rowId, direction) => {
				const config = table.options.rowOrdering
				if (config === undefined) return false
				if (config.onChange === undefined && !isTopLevelRow(table, rowId)) return false
				return moveRow(table, rowId, direction) !== undefined
			},

			moveRow: (rowId, direction) => {
				const config = table.options.rowOrdering
				if (config === undefined) return

				const move = moveRow(table, rowId, direction)
				if (!move) return

				if (config.onChange) {
					config.onChange(move)
					return
				}

				if (!isTopLevelRow(table, rowId)) return

				// Uncontrolled. The order is written over **every** row the table holds, not over
				// the rendered ones: a page or a filter shows a subset, and an order naming only
				// that subset would silently drop the next move made outside it — `applyRowMove`
				// leaves an order that names neither row alone, so the row would simply not move
				// while its menu entry stayed enabled.
				//
				// `applyRowOrder` is what merges the two: the ids already arranged keep the order
				// the user gave them, and every other row keeps its position in `data`. That also
				// makes this a no-op on an adapter that already renders the projected data.
				const order = applyRowOrder(
					table.getCoreRowModel().rows.map((row) => row.id),
					table.getState().rowOrder,
					(rowId) => rowId,
				)
				table.setState((prev) => ({ ...prev, rowOrder: applyRowMove(order, move) }))
			},
		}
	},
}
