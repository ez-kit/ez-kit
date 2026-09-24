import type { LoadingState } from '../../types'
// The feature's own state type, re-exported from the module that declares the slice, so a reader
// finds the type beside the `TableState_FeatureMap` entry that names it.
export type { LoadingState } from '../../types'
import type { TableFeature } from '@tanstack/table-core'

declare module '@tanstack/table-core' {
	// Declaration merging needs interfaces; `TableState_All` and `Plugins` are the two upstream
	// declares as such.
	// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
	interface Plugins {
		loadingFeature: TableFeature
	}

	// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
	interface TableState_FeatureMap {
		loadingFeature: { loading: LoadingState }
	}

	// `TableState_FeatureMap` feeds `TableState<TFeatures>` only. `TableState_All` is the broad
	// shape feature internals read through — and `SliceKey` in `../../feature-state` is
	// `keyof TableState_All` — so a feature that merges only the map cannot name its own slice.
	// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
	interface TableState_All {
		loading?: LoadingState
	}
}

/**
 * Default seed for the fully-controlled `state.loading` slice: every flag starts
 * falsy and `error` starts `null`. The consumer overrides these through the
 * controlled `state.loading` option; the grid never mutates them.
 */
const INITIAL_LOADING_STATE: LoadingState = {
	isPending: false,
	isFetching: false,
	isError: false,
	error: null,
}

/**
 * Controlled loading-status feature. Owns **only** `getInitialState` — it seeds the
 * `state.loading` slice with {@link INITIAL_LOADING_STATE}, and any `initialState.loading`
 * supplied at construction replaces it.
 *
 * The slice is **user-owned / fully controlled**: the consumer feeds every field through v9's
 * own ownership model — `options.state.loading`, or an external atom on `options.atoms.loading` —
 * typically from a data library's query status (React Query / SWR) or local `useState`. There is
 * intentionally **no grid-owned writer** — no `setFetchingStatus`, no `getIsLoading` alias — so
 * the grid only ever reads this slice to render, and this feature installs no table API at all.
 */
export const loadingFeature: TableFeature = {
	getInitialState: (initialState) => ({
		loading: { ...INITIAL_LOADING_STATE },
		// Spread last: `initialState` carries what earlier features and the user already
		// contributed, and the user's seed wins over this feature's default.
		...initialState,
	}),
}

export { INITIAL_LOADING_STATE }
