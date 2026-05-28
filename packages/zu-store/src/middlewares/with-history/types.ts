/**
 * Optional tag for a single write, carried through the third positional
 * argument of `set(partial, replace, action)` — the same convention used
 * by Zustand's `devtools` middleware. Passed through to {@link HistoryOptions.shouldRecord}
 * so consumers can filter history entries by action kind.
 */
export type HistoryActionTag = string | { type: string }

export type HistoryOptions<T> = {
	/** Maximum number of past states to keep. Defaults to 100. */
	limit?: number
	/** Start history recording paused. Defaults to false. */
	defaultPaused?: boolean
	/** Pre-populate the pasts stack. Entries exceeding `limit` are trimmed from the front. */
	defaultPasts?: T[]
	/** Pre-populate the futures stack. Entries exceeding `limit` are trimmed from the front. */
	defaultFutures?: T[]
	/**
	 * Predicate run before recording a write.
	 *
	 * Return `false` to skip the history entry — the store state still updates,
	 * only the recording is suppressed.
	 *
	 * @param prev   state before the write
	 * @param next   state after the write (merged with current when `replace !== true`)
	 * @param action optional third positional arg from `set(partial, replace, action)`
	 */
	shouldRecord?: (prev: T, next: T, action?: HistoryActionTag) => boolean
}

export type HistoryState<T> = {
	readonly pasts: readonly T[]
	readonly futures: readonly T[]
	readonly limit: number
	readonly isPaused: boolean
	undo: () => void
	redo: () => void
	/**
	 * Jump atomically to position `index` in the linear timeline.
	 *
	 * Position `pasts.length` is the current state. Valid range is
	 * `[0, pasts.length + futures.length]`; out-of-range indices are clamped.
	 * Issues exactly one update on each of the store and the history sub-store.
	 */
	goto: (index: number) => void
	clear: () => void
	pause: () => void
	resume: () => void
	/**
	 * Run `fn` with history recording suppressed. Re-entrant: nested
	 * `skip` calls preserve the outer `isPaused` value when they return.
	 */
	skip: (fn: () => void) => void
}
