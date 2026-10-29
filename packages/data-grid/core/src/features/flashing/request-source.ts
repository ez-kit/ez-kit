/*
 * The cell-facing half of `cellFlashingFeature`, kept apart from the feature object so a reader of
 * the request source — the React layer's cells — does not import the feature itself.
 */

import type { FlashStatus } from './types'

/**
 * Which rendered cells `table.flashCells` flashes, and for how long.
 *
 * An axis left out means every cell along it: `{ rowIds: ['r1'] }` is the whole row, `{}` every
 * rendered cell. Durations left out fall back to the column's, then the grid's, then the defaults.
 * `status` left out is `'default'`: a manual flash has no previous value to hand a column's `status`.
 */
export type FlashCellsParams = {
	rowIds?: readonly string[]
	columnIds?: readonly string[]
	flashDuration?: number
	fadeDuration?: number
	/** The colour of this flash. Default: `'default'` — a column's `status` is not consulted. */
	status?: FlashStatus
}

/** One `flashCells` call as cells read it: the params, numbered so each call is a new value. */
export type FlashRequest = FlashCellsParams & {
	readonly seq: number
}

/**
 * The read side of the request atom — exactly what `@tanstack/react-store`'s `useSelector` takes.
 *
 * Declared structurally rather than as `@tanstack/store`'s `Atom` so this package keeps reaching
 * the store only through `table-core`, as `deferred-apply` does, instead of depending on it.
 */
export type FlashRequestSource = {
	get: () => FlashRequest | null
	subscribe: (listener: (request: FlashRequest | null) => void) => { unsubscribe: () => void }
}

/**
 * The request source of a table, or `undefined` when `cellFlashingFeature` is not registered.
 *
 * Read off a table whose feature set is unresolved, so the member is reached through a cast: the
 * `Table_FeatureMap` entry contributes `_flashRequests` only where the feature is provably in the
 * set, which a cell rendered by the shared React layer cannot prove.
 */
export function flashRequestsOf(table: object): FlashRequestSource | undefined {
	return (table as { _flashRequests?: FlashRequestSource })._flashRequests
}
