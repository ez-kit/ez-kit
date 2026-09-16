import { assignTableInstanceData, readOwnSlice, writeOwnSlice } from '../../feature-state'

import { applyRowOrder } from './apply-row-order'
import { applyRowMove, moveRow } from './row-ordering'

import type { RowMoveDirection } from './row-ordering'
import type { RowOrderingConfig } from '../../types'
import type { RowData, TableFeature, TableFeatures } from '@tanstack/table-core'

/**
 * The user's row order, as row ids.
 *
 * Empty until the first move — an untouched grid renders `data` exactly as given — and
 * complete from then on, the same rule `columnOrder` follows. See `applyRowOrder` for what a
 * row absent from it does.
 */
export type RowOrderState = string[]

export type RowOrderingApi = {
	/** Whether this step is available — what a menu entry's disabled state reads. */
	canMoveRow: (rowId: string, direction: RowMoveDirection) => boolean
	/** Take one step, if it is available. A no-op otherwise. */
	moveRow: (rowId: string, direction: RowMoveDirection) => void
}

declare module '@tanstack/table-core' {
	// Declaration merging needs interfaces; these are the shapes upstream declares as such.
	// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
	interface Plugins {
		rowOrderingFeature: TableFeature
	}

	// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
	interface TableState_FeatureMap {
		rowOrderingFeature: { rowOrder: RowOrderState }
	}

	// `TableState_FeatureMap` feeds `TableState<TFeatures>` only; `TableState_All` is what feature
	// internals — and `SliceKey` in `../../feature-state` — read through. See `loading.ts`.
	// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
	interface TableState_All {
		rowOrder?: RowOrderState
	}

	// eslint-disable-next-line @typescript-eslint/consistent-type-definitions, @typescript-eslint/no-unused-vars
	interface TableOptions_FeatureMap<TFeatures extends TableFeatures, TData extends RowData> {
		rowOrderingFeature: {
			/**
			 * The resolved row half of `ordering`, or absent when the axis is off.
			 *
			 * Its own key rather than the public `ordering` object: every gate — `ordering: true`
			 * meaning columns only, `enabled: false`, the axis being named — is resolved once in
			 * `createTable`, so presence here is the whole answer to "is row reordering on".
			 */
			rowOrdering?: RowOrderingConfig
		}
	}

	// eslint-disable-next-line @typescript-eslint/consistent-type-definitions, @typescript-eslint/no-unused-vars
	interface Table_FeatureMap<TFeatures extends TableFeatures, TData extends RowData> {
		rowOrderingFeature: {
			/** Row reordering, driven by the row menu's move entries and by `Alt+Arrow`. */
			ordering: RowOrderingApi
		}
	}
}

/**
 * The feature's own option, read off a table whose `TFeatures` is unresolved.
 *
 * `table.options` is `TableOptions<TFeatures, TData>`, assembled from `TableOptions_FeatureMap`
 * by feature key, so a key this feature merged in is not provable inside the feature itself.
 * Upstream's custom-feature skill reads its own option the same way.
 */
const rowOrderingOption = (table: { readonly options: object }): RowOrderingConfig | undefined =>
	(table.options as { rowOrdering?: RowOrderingConfig }).rowOrdering

/**
 * The core row model this feature reads — every row the table holds, not the rendered ones.
 *
 * Structural for the same reason `RowOrderingTable` in `./row-ordering` is, and that reason is
 * recorded in full there: naming `Table<TFeatures, TData>` inside feature code leaves every
 * feature-supplied member unresolved, and the all-in instantiation that does resolve them is not
 * something a narrow table can be passed as.
 */
type CoreRowModelTable = {
	getCoreRowModel: () => {
		rows: { id: string }[]
		rowsById: Record<string, { depth: number } | undefined>
	}
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
function isTopLevelRow(table: CoreRowModelTable, rowId: string): boolean {
	const row = table.getCoreRowModel().rowsById[rowId]
	return row === undefined || row.depth === 0
}

/**
 * The row half of `ordering`, as a v9 table feature.
 *
 * Owns the `rowOrder` slice and the one writer that touches it. The mode is read per call
 * rather than captured at construction, because the React adapter re-syncs `rowOrdering` on
 * every render so that an inline `onChange` is never the closure from first mount.
 *
 * Note the feature owns the order but does **not** apply it: rendering rows in a new order
 * means reordering `data`, which belongs to whoever owns the render loop. `applyRowOrder` is
 * exported for exactly that, and the React adapter calls it.
 *
 * `ordering` is attached in `initTableInstanceData` rather than through `assignTableAPIs`
 * because it is a namespace **object**, not a method: `assignTableAPIs` installs one function
 * per key (stripping the `table_` prefix), so it has no way to express `table.ordering.moveRow`.
 * `initTableInstanceData` is the hook for table-owned data, it runs once after the options, the
 * state atoms and the store exist, and both members read the options at call time, so nothing
 * here is captured too early.
 */
export const rowOrderingFeature: TableFeature = {
	getInitialState: (initialState) => ({
		rowOrder: [],
		// Spread last — `initialState` carries what earlier features and the user contributed.
		...initialState,
	}),

	initTableInstanceData: (table) => {
		const api: RowOrderingApi = {
			canMoveRow: (rowId, direction) => {
				const config = rowOrderingOption(table)
				if (config === undefined) return false
				if (config.onChange === undefined && !isTopLevelRow(table, rowId)) return false
				return moveRow(table, rowId, direction) !== undefined
			},

			moveRow: (rowId, direction) => {
				const config = rowOrderingOption(table)
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
					readOwnSlice(table, 'rowOrder'),
					(rowId) => rowId,
				)
				writeOwnSlice(table, 'rowOrder', applyRowMove(order, move))
			},
		}

		// Not a hand-written cast: `assignTableInstanceData` checks `'ordering'` against the
		// `Table_FeatureMap` entry above, so a misspelled member cannot install silently.
		assignTableInstanceData('rowOrderingFeature', table, { ordering: api })
	},
}
