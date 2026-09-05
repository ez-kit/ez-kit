import type { HistoryAdapter, HistoryApi, HistoryOptions, HistorySnapshot } from './types'

const DEFAULT_LIMIT = 100

/** Keep at most `limit` entries, dropping the OLDEST — the front of the stack. */
function trim<T>(stack: T[], limit: number): T[] {
	return stack.length > limit ? stack.slice(stack.length - limit) : stack
}

export function createHistoryStack<T, TMeta = unknown>(
	adapter: HistoryAdapter<T>,
	options: HistoryOptions<T, TMeta> = {},
): HistoryApi<T, TMeta> {
	const limit = options.limit ?? DEFAULT_LIMIT
	const shouldRecord = options.shouldRecord

	let pasts = trim([...(options.defaultPasts ?? [])], limit)
	let futures = trim([...(options.defaultFutures ?? [])], limit)
	let isPaused = options.defaultPaused ?? false

	function publish(): void {
		const next: HistorySnapshot<T> = { pasts: [...pasts], futures: [...futures], limit, isPaused }
		adapter.onStateChange(next)
	}

	/** Run `fn` with recording suppressed; re-entrant, so nested calls restore the OUTER value. */
	function skip(fn: () => void): void {
		const prior = isPaused
		isPaused = true
		try {
			fn()
		} finally {
			isPaused = prior
		}
	}

	/** Write `state` back without the resulting notification landing in the stacks. */
	function restore(state: T): void {
		skip(() => {
			adapter.write(state)
		})
	}

	const api: HistoryApi<T, TMeta> = {
		record(prev, next, meta) {
			if (isPaused) return
			if (shouldRecord && !shouldRecord(prev, next, meta)) return

			pasts = trim([...pasts, prev], limit)
			futures = []
			publish()
		},

		undo() {
			const prev = pasts.at(-1)
			if (prev === undefined) return

			const current = adapter.read()
			pasts = pasts.slice(0, -1)
			// `futures[0]` is the very next redo step — an over-limit stack (reachable via
			// `defaultFutures`, not just accumulation) must drop the FARTHEST entry (the tail), never
			// the one `undo` just put back. Trimming from the front here would delete the state undo
			// just left, making the very next `redo` land somewhere else entirely.
			futures = [current, ...futures].slice(0, limit)
			restore(prev)
			publish()
		},

		redo() {
			const next = futures.at(0)
			if (next === undefined) return

			const current = adapter.read()
			futures = futures.slice(1)
			pasts = trim([...pasts, current], limit)
			restore(next)
			publish()
		},

		/**
		 * Jump to absolute position `index` on the linear timeline `[...pasts, current, ...futures]`.
		 * Position `pasts.length` is the current state. Out-of-range indices are clamped rather than
		 * rejected. Issues exactly one `write` and one `onStateChange`, whatever the distance.
		 */
		goto(index) {
			const timeline = [...pasts, adapter.read(), ...futures]
			const target = Math.min(Math.max(index, 0), timeline.length - 1)
			if (target === pasts.length) return

			// `goto` only reorders an already-bounded timeline — it introduces no new entries, so
			// there is nothing here for a `limit` cap to defend against. Trimming would silently
			// delete reachable states (and not even reliably: a mid-target `goto` leaves
			// `pasts.length + futures.length` unchanged, so it wouldn't restore `total ≤ limit`
			// either) whenever a seed (`defaultPasts` + `defaultFutures`, each capped independently)
			// put the combined stack over `limit` to begin with.
			const state = timeline[target] as T
			pasts = timeline.slice(0, target)
			futures = timeline.slice(target + 1)
			restore(state)
			publish()
		},

		clear() {
			pasts = []
			futures = []
			publish()
		},

		pause() {
			if (isPaused) return
			isPaused = true
			publish()
		},

		resume() {
			if (!isPaused) return
			isPaused = false
			publish()
		},

		skip,

		get isPaused() {
			return isPaused
		},
	}

	publish()
	return api
}
