import type { LoadingState } from '../../types'

// Re-exported so `index.ts` can source `LoadingState` from this module. That pulls
// this file (and its `declare module '@tanstack/table-core'` augmentation for
// `state.loading`) into the bundled `.d.ts` — otherwise rollup-dts drops the
// augmentation and downstream packages lose the types.
export type { LoadingState } from '../../types'
import type { InitialTableState, RowData, TableFeature, TableState } from '@tanstack/table-core'

declare module '@tanstack/table-core' {
	// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
	interface TableState {
		loading: LoadingState
	}
}

/**
 * Default seed for the fully-controlled `state.loading` slice: every flag starts
 * falsy and `error` starts `null`. The consumer overrides these through the
 * controlled `state.loading` prop; the grid never mutates them.
 */
const INITIAL_LOADING_STATE: LoadingState = {
	isPending: false,
	isFetching: false,
	isError: false,
	error: null,
}

/**
 * Controlled loading-status feature. Owns **only** `getInitialState` — it seeds the
 * `state.loading` slice with {@link INITIAL_LOADING_STATE} and merges any controlled
 * `state.loading` supplied at construction.
 *
 * The slice is **user-owned / fully controlled**: the consumer feeds every field via
 * the controlled `table.state.loading` prop (mirrored one-way by `syncControlledState`),
 * typically from a data library's query status (React Query / SWR) or local `useState`.
 * There is intentionally **no grid-owned writer** — no `setFetchingStatus`, no
 * `getIsLoading` alias — so the grid only ever reads this slice to render.
 */
export const LoadingFeature: TableFeature<RowData> = {
	getInitialState: (state?: InitialTableState) =>
		({
			...state,
			loading: { ...INITIAL_LOADING_STATE, ...(state as Partial<TableState> | undefined)?.loading },
		}) as Partial<TableState>,
}

export { INITIAL_LOADING_STATE }
