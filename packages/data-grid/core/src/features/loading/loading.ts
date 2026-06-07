import type { InitialTableState, RowData, Table, TableFeature, TableState } from '@tanstack/table-core'

/**
 * Loading feature — full-grid initial-load indicator.
 *
 * `loading` is plain table state (`state.loading.isLoading`), TanStack-style: set the
 * default via `initialState.loading` and control it via the `state` prop on the React
 * `useDataGrid` hook. There is intentionally no bespoke `loading` config prop and no
 * imperative `setLoading()` — a single source (controlled `state`) avoids drift.
 * `getIsLoading()` remains a read-only convenience. Incremental fetch status (infinite
 * scroll) lives in the grid-owned `InfiniteFeature`.
 */
export type LoadingState = {
	isLoading: boolean
}

declare module '@tanstack/table-core' {
	// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
	interface TableState {
		loading: LoadingState
	}

	// eslint-disable-next-line @typescript-eslint/consistent-type-definitions, @typescript-eslint/no-unused-vars
	interface Table<TData extends RowData> {
		getIsLoading: () => boolean
	}
}

export const LoadingFeature: TableFeature<RowData> = {
	getInitialState: (state?: InitialTableState) =>
		({
			...state,
			loading: (state as Partial<TableState> | undefined)?.loading ?? ({ isLoading: false } satisfies LoadingState),
		}) as Partial<TableState>,

	createTable: (table: Table<RowData>) => {
		// loading state is always initialised by getInitialState; written one-way from
		// the controlled `loading` prop via syncControlledState (no imperative setter).
		table.getIsLoading = () => table.getState().loading.isLoading
	},
}
