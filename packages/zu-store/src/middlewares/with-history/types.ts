import type { StoreApi } from 'zustand/vanilla'

export interface HistoryOptions<T> {
	/** Maximum number of past states to keep. Defaults to 100. */
	limit?: number
	/** Start history recording paused. Defaults to false. */
	defaultPaused?: boolean
	/** Pre-populate the pasts stack. Entries exceeding limit are trimmed from the front. */
	defaultPasts?: T[]
	/** Pre-populate the futures stack. */
	defaultFutures?: T[]
	/**
	 * Custom predicate called before recording.
	 * Return false to skip this particular change.
	 */
	shouldPush?: (prev: T, next: T) => boolean
}

export interface SetOptions {
	/** When true the setState call is not recorded in history. */
	skipHistory?: boolean
}

export interface HistoryState<T> {
	readonly pasts: readonly T[]
	readonly futures: readonly T[]
	readonly limit: number
	readonly isPaused: boolean
	undo: () => void
	redo: () => void
	clear: () => void
	pause: () => void
	resume: () => void
}

export type HistoryStore<T extends object> = Omit<StoreApi<T>, 'setState'> & {
	setState: (
		partial: T | Partial<T> | ((state: T) => T | Partial<T>),
		replace?: boolean,
		options?: SetOptions,
	) => void
	set: (partial: Partial<T> | ((state: T) => Partial<T>), options?: SetOptions) => void
	history: StoreApi<HistoryState<T>>
}
