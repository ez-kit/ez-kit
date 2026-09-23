export type HistoryOptions<T, TMeta = unknown> = {
	limit?: number
	defaultPaused?: boolean
	defaultPasts?: T[]
	defaultFutures?: T[]
	shouldRecord?: (prev: T, next: T, meta?: TMeta) => boolean
}

/**
 * The part of a store's state that history tracks. A binding adds this beside its
 * {@link HistoryOptions}, which it then instantiates over `TSlice` rather than the full state `T`:
 * the stack only ever sees slices, so `defaultPasts`, `defaultFutures`, `shouldRecord` and the
 * published `pasts` / `futures` are all slices too.
 *
 * Omitted, the slice is the whole state and restoring a step replaces it. Given, restoring a step
 * merges the slice back shallowly, leaving every field outside it as it is, and a write that leaves
 * the slice shallow-equal to what it was records nothing — see {@link isSameSlice}.
 */
export type PartializeOption<T, TSlice> = {
	partialize?: (state: T) => TSlice
}

export type HistorySnapshot<T> = {
	readonly pasts: readonly T[]
	readonly futures: readonly T[]
	readonly limit: number
	readonly isPaused: boolean
}

export type HistoryAdapter<T> = {
	read: () => T
	write: (state: T) => void
	onStateChange: (snapshot: HistorySnapshot<T>) => void
}

export type HistoryApi<T, TMeta = unknown> = {
	record: (prev: T, next: T, meta?: TMeta) => void
	undo: () => void
	redo: () => void
	goto: (index: number) => void
	clear: () => void
	pause: () => void
	resume: () => void
	skip: (fn: () => void) => void
	readonly isPaused: boolean
}
