import { warnOnce } from '../../utils/warn-once'

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

const IS_DEV = process.env.NODE_ENV !== 'production'

/** The three flags; an object carrying none of them is not a loading status at all. */
const LOADING_FLAGS = ['isPending', 'isFetching', 'isError'] as const

const LOADING_KEYS: readonly string[] = Object.keys(INITIAL_LOADING_STATE)

/**
 * Warns, in development, about a seed that is almost certainly some other library's status object
 * passed whole — an SWR response carries `isLoading` / `isValidating` / `error` and none of the
 * flags. `Partial<LoadingState>` is a weak type, so its shared `error` key lets one through the
 * checker, and the grid would then never show a loading state. `{}` and `{ error }` stay silent:
 * both are legitimate, and neither carries a key this slice does not know.
 */
function warnOnUnrecognisedSeed(seed: object): void {
	if (!IS_DEV) return
	if (LOADING_FLAGS.some((flag) => flag in seed)) return
	const foreign = Object.keys(seed).filter((key) => !LOADING_KEYS.includes(key))
	if (foreign.length === 0) return
	warnOnce(
		`[data-grid] \`initialState.loading\` received an object with unrecognised key(s) ${foreign.map((key) => `"${key}"`).join(', ')} and none of \`isPending\`, \`isFetching\`, \`isError\`, so the grid will never show a loading state. Map your data library's status onto those fields.`,
	)
}

/**
 * Controlled loading-status feature. Owns **only** `getInitialState` — it seeds the
 * `state.loading` slice with {@link INITIAL_LOADING_STATE}, and any `initialState.loading`
 * supplied at construction is merged over it: a seed may name only the fields it cares about,
 * and the slice it produces always carries all four.
 *
 * The slice is **user-owned / fully controlled**: the consumer feeds every field through v9's
 * own ownership model — `options.state.loading`, or an external atom on `options.atoms.loading` —
 * typically from a data library's query status (React Query / SWR) or local `useState`. There is
 * intentionally **no grid-owned writer** — no `setFetchingStatus`, no `getIsLoading` alias — so
 * the grid only ever reads this slice to render, and this feature installs no table API at all.
 */
export const loadingFeature: TableFeature = {
	getInitialState: (initialState) => {
		// Typed as the slice, but a consumer's seed is `Partial<LoadingState>` — see
		// `InitialTableState.loading`.
		const rawSeed: Partial<LoadingState> | undefined = initialState.loading
		// The type rules a non-object out, but a JS caller can still hand one in, and the `in`
		// checks below would throw on it. Treated as no seed, as the react side treats it.
		// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- runtime guard: the type cannot see an untyped caller's `null`
		const seed = typeof rawSeed === 'object' && rawSeed !== null ? rawSeed : undefined
		if (seed !== undefined) warnOnUnrecognisedSeed(seed)
		return {
			// Spread before `loading`: `initialState` carries what earlier features and the user
			// already contributed, and the user's seed wins field by field over this default.
			...initialState,
			loading: { ...INITIAL_LOADING_STATE, ...pickLoadingFields(seed) },
		}
	},
}

/**
 * The fields of `seed` this slice knows, and only those that are present — so a foreign key
 * never reaches the store, and an explicit `error: undefined` survives as `undefined`.
 */
function pickLoadingFields(seed: Partial<LoadingState> | undefined): Partial<LoadingState> {
	if (seed === undefined) return {}
	return Object.fromEntries(
		LOADING_KEYS.filter((key) => key in seed).map((key) => [key, seed[key as keyof LoadingState]]),
	)
}

export { INITIAL_LOADING_STATE }
