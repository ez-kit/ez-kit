import { shallow } from './utils/shallow-equal'

import type { LoadingState } from '@ez-kit/data-grid-core'

/**
 * The controlled `state` prop with its slice keys erased — the shape `useDataGrid` already
 * publishes and filters echoes against, since no slice name is provable while `TFeatures` is a
 * parameter.
 */
type ErasedState = Record<string, unknown>

/**
 * The slice's defaults. A private copy of core's `INITIAL_LOADING_STATE`, which is not exported:
 * exporting it from core's root would make it public API of both packages, for one internal
 * reader. `partial-loading-state.test.tsx` holds the two to the same values.
 */
const DEFAULT_LOADING: LoadingState = {
	isPending: false,
	isFetching: false,
	isError: false,
	error: null,
}

const LOADING_KEY = 'loading'

/** The three flags; an object carrying none of them is not a loading status at all. */
const LOADING_FLAGS = ['isPending', 'isFetching', 'isError'] as const

const LOADING_KEYS: readonly string[] = Object.keys(DEFAULT_LOADING)

/**
 * Completes a partial `loading` over the defaults. Copies only the four fields the slice knows,
 * and only those present — so a TanStack Query result is narrowed rather than stored whole, and an
 * explicit `error: undefined` survives as `undefined`.
 */
function completeLoading(loading: object): LoadingState {
	const present = LOADING_KEYS.filter((key) => key in loading).map((key) => [key, (loading as ErasedState)[key]])
	return { ...DEFAULT_LOADING, ...(Object.fromEntries(present) as Partial<LoadingState>) }
}

/**
 * The controlled `state` prop with `state.loading` completed, ready to publish.
 *
 * `previous` is the last value this returned. Its `loading` is reused while the four fields are
 * equal, and **that identity is load-bearing**: upstream's publish compares a slice by reference,
 * and so does the echo filter in `useDataGrid`. Completing afresh on every render would hand the
 * store a new object each commit, rewrite the slice, stop the echo filter recognising the
 * consumer's own value and report it back through `onStateChange` — a loop for any consumer that
 * mirrors the callback into React state.
 *
 * A state without `loading` is returned as given, so a grid that never controls the slice
 * publishes exactly what it did before.
 */
export function normalizeControlledState(
	previous: ErasedState | undefined,
	next: ErasedState | undefined,
): ErasedState | undefined {
	const loading = next?.[LOADING_KEY]
	if (next === undefined || typeof loading !== 'object' || loading === null) return next
	const completed = completeLoading(loading)
	const previousLoading = previous?.[LOADING_KEY]
	return { ...next, [LOADING_KEY]: shallow<unknown>(previousLoading, completed) ? previousLoading : completed }
}

/**
 * The development warning for a `state.loading` that is almost certainly another library's status
 * object passed whole, or `undefined` when there is nothing to say.
 *
 * `Partial<LoadingState>` is a weak type: the checker accepts any object sharing one key with it,
 * and an SWR response shares `error` while carrying `isLoading` / `isValidating` and none of the
 * flags — a grid fed one would never show a loading state. The rule is "a key the slice does not
 * know, and none of the flags", which keeps `{}` and `{ error }` silent: both are legitimate.
 * Core's `loadingFeature` says the same about `initialState.loading`.
 */
export function describeUnrecognisedLoading(loading: object): string | undefined {
	if (LOADING_FLAGS.some((flag) => flag in loading)) return undefined
	const foreign = Object.keys(loading).filter((key) => !LOADING_KEYS.includes(key))
	if (foreign.length === 0) return undefined
	return (
		`[data-grid] \`state.loading\` received an object with unrecognised key(s) ` +
		`${foreign.map((key) => `"${key}"`).join(', ')} and none of \`isPending\`, \`isFetching\`, \`isError\`, ` +
		`so the grid will never show a loading state. Map your data library's status onto those fields.`
	)
}

export { DEFAULT_LOADING }
