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
			canMoveRow: (rowId, direction) =>
				table.options.rowOrdering !== undefined && moveRow(table, rowId, direction) !== undefined,

			moveRow: (rowId, direction) => {
				const config = table.options.rowOrdering
				if (config === undefined) return

				const move = moveRow(table, rowId, direction)
				if (!move) return

				if (config.onChange) {
					config.onChange(move)
					return
				}

				// Uncontrolled. The order is seeded from the rendered rows on the first move, so
				// an untouched grid holds `[]` and nothing downstream has to reorder anything.
				const current = table.getState().rowOrder
				const order = current.length > 0 ? current : table.getRowModel().rows.map((row) => row.id)
				table.setState((prev) => ({ ...prev, rowOrder: applyRowMove(order, move) }))
			},
		}
	},
}
