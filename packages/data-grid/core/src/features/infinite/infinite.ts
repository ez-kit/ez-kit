import { assignTableAPIs } from '@tanstack/table-core'

import { writeOwnSlice } from '../../feature-state'

import type { InfiniteState } from '../../types'
// The feature's own state type, re-exported from the module that declares the slice, so a reader
// finds the type beside the `TableState_FeatureMap` entry that names it.
export type { InfiniteState } from '../../types'
import type { RowData, TableFeature, TableFeatures } from '@tanstack/table-core'

declare module '@tanstack/table-core' {
	// Declaration merging needs interfaces; these are the shapes upstream declares as such.
	// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
	interface Plugins {
		infiniteFeature: TableFeature
	}

	// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
	interface TableState_FeatureMap {
		infiniteFeature: { infinite: InfiniteState }
	}

	// `TableState_FeatureMap` feeds `TableState<TFeatures>` only; `TableState_All` is what feature
	// internals — and `SliceKey` in `../../feature-state` — read through. See `loading.ts`.
	// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
	interface TableState_All {
		infinite?: InfiniteState
	}

	// eslint-disable-next-line @typescript-eslint/consistent-type-definitions, @typescript-eslint/no-unused-vars
	interface Table_FeatureMap<TFeatures extends TableFeatures, TData extends RowData> {
		infiniteFeature: {
			/**
			 * Merge a partial update into `state.infinite`. The **only** writer for this
			 * 100% grid-owned slice (`isFetchingNextPage`, `isFetchingPreviousPage`, `error`).
			 * Driven by the React layer around the `onLoadMore` promise.
			 */
			setInfiniteStatus: (partial: Partial<InfiniteState>) => void
			/** Append rows after the current data, immutably — what an `onLoadMore` handler calls. */
			appendData: (rows: TData[]) => void
			/** Insert rows before the current data, immutably. */
			prependData: (rows: TData[]) => void
		}
	}
}

const INITIAL_INFINITE_STATE: InfiniteState = {
	isFetchingNextPage: false,
	isFetchingPreviousPage: false,
	error: null,
}

/**
 * Headless infinite-scroll status feature.
 *
 * Holds the grid-owned `state.infinite` slice and exposes `setInfiniteStatus`, plus the two
 * data helpers an `onLoadMore` handler reaches for. This feature is **DOM-agnostic** — it never
 * observes scroll or runs timers. Edge detection, the `onLoadMore` promise lifecycle, and the
 * `hasNextPage` guard live in the React layer (`hasNextPage` is a {@link PaginationConfig}
 * option, not state).
 *
 * `appendData` / `prependData` sit here rather than on the grid's own table type because they
 * belong to infinite scrolling: a grid assembled without this feature does not have them, and
 * `Table_FeatureMap` makes the type say so.
 */
export const infiniteFeature: TableFeature = {
	getInitialState: (initialState) => ({
		infinite: { ...INITIAL_INFINITE_STATE },
		// Spread last — `initialState` carries what earlier features and the user contributed.
		...initialState,
	}),

	constructTableAPIs: (table) => {
		assignTableAPIs('infiniteFeature', table, {
			// `getFunctionNameInfo` strips the `table_` prefix, so these install as
			// `setInfiniteStatus`, `appendData` and `prependData`.
			table_setInfiniteStatus: {
				fn: (partial: Partial<InfiniteState>) => {
					// `writeOwnSlice`, not `baseAtoms.infinite.set`: the accessor routes through
					// `options.onInfiniteChange` when one exists and through `makeStateUpdater`
					// otherwise, which is also the only route that respects an external atom a
					// consumer supplied for this slice.
					writeOwnSlice(table, 'infinite', (prev) => ({ ...prev, ...partial }))
				},
			},
			table_appendData: {
				fn: (rows: readonly unknown[]) => {
					table.setOptions((prev) => ({ ...prev, data: [...prev.data, ...rows] }))
				},
			},
			table_prependData: {
				fn: (rows: readonly unknown[]) => {
					table.setOptions((prev) => ({ ...prev, data: [...rows, ...prev.data] }))
				},
			},
		})
	},
}

export { INITIAL_INFINITE_STATE }
