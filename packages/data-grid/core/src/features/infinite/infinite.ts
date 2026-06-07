import type { InfiniteState } from '../../types'
import type { InitialTableState, RowData, Table, TableFeature, TableState } from '@tanstack/table-core'

declare module '@tanstack/table-core' {
	// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
	interface TableState {
		infinite: InfiniteState
	}

	// eslint-disable-next-line @typescript-eslint/consistent-type-definitions, @typescript-eslint/no-unused-vars
	interface Table<TData extends RowData> {
		/**
		 * Merge a partial update into `state.infinite`. The **only** writer for this
		 * 100% grid-owned slice (`isFetchingNextPage`, `isFetchingPreviousPage`, `error`).
		 * Driven by the React layer around the `onLoadMore` promise.
		 */
		setInfiniteStatus: (partial: Partial<InfiniteState>) => void
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
 * Holds the grid-owned `state.infinite` slice and exposes `setInfiniteStatus`. This
 * feature is **DOM-agnostic** — it never observes scroll or runs timers. Edge detection,
 * the `onLoadMore` promise lifecycle, and the `hasNextPage` guard live in the React layer
 * (`hasNextPage` is a {@link PaginationConfig} option, not state). This feature is only
 * the grid-owned state container the React layer writes through.
 */
export const InfiniteFeature: TableFeature<RowData> = {
	getInitialState: (state?: InitialTableState) =>
		({
			...state,
			infinite: { ...INITIAL_INFINITE_STATE, ...(state as Partial<TableState> | undefined)?.infinite },
		}) as Partial<TableState>,

	createTable: (table: Table<RowData>) => {
		table.setInfiniteStatus = (partial) => {
			table.setState((prev) => ({
				...prev,
				infinite: { ...prev.infinite, ...partial },
			}))
		}
	},
}

export { INITIAL_INFINITE_STATE }
