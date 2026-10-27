import type { ColumnStateApi } from '@ez-kit/data-grid-core'

/** The controlled `state` prop with its slice keys erased, as `useDataGrid` publishes it. */
type ErasedState = Record<string, unknown>

/** The three slices a column invariant constrains. */
const COLUMN_SLICES = ['columnPinning', 'columnOrder', 'columnVisibility'] as const

type ColumnSlice = (typeof COLUMN_SLICES)[number]

/** Per slice, the last value the consumer passed, the invariants it met, and what it became. */
export type ColumnSliceCache = Partial<Record<ColumnSlice, { input: unknown; signature: string; output: unknown }>>

/**
 * The controlled `state` prop with the column invariants applied, ready to publish.
 *
 * The publish writes straight into the table's base atoms, past the `on<Slice>Change` handlers
 * that enforce the invariants on every other write — so without this a controlled
 * `columnPinning: { start: [], end: [] }` unpinned the system columns.
 *
 * Each corrected slice is cached against the **reference** the consumer passed and the invariants'
 * `signature` — the config can add or remove a forced column while the consumer's slice stays the
 * same object, and a cache on the reference alone would then keep publishing the old correction.
 * The reference
 * is load-bearing for the reason `normalizeControlledState` gives: a correction rebuilt on every
 * render would rewrite the slice each commit. The corrected value is also what the echo filter
 * compares the store against, so a correction is not reported back through `onStateChange` — the
 * grid fixing its input is not a change the user made.
 *
 * Returns `next` itself when no slice needed correcting.
 */
export function enforceControlledColumns(
	cache: ColumnSliceCache,
	next: ErasedState | undefined,
	columnState: ColumnStateApi,
): ErasedState | undefined {
	if (next === undefined) return next
	let corrected: ErasedState | undefined
	for (const key of COLUMN_SLICES) {
		if (!(key in next)) continue
		const input = next[key]
		const cached = cache[key]
		const { signature } = columnState
		const output =
			cached !== undefined && cached.input === input && cached.signature === signature
				? cached.output
				: columnState.enforce({ [key]: input })[key]
		cache[key] = { input, signature, output }
		if (output !== input) corrected = { ...(corrected ?? next), [key]: output }
	}
	return corrected ?? next
}
