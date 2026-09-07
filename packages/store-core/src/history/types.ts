export type HistoryOptions<T, TMeta = unknown> = {
	limit?: number
	defaultPaused?: boolean
	defaultPasts?: T[]
	defaultFutures?: T[]
	shouldRecord?: (prev: T, next: T, meta?: TMeta) => boolean
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
