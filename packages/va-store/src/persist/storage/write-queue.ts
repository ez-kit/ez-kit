/**
 * Serialize async writes for one substrate with **last-write-wins** semantics. While a write is in
 * flight, only the most recent enqueued value is retained; any value it superseded is dropped and never
 * written. Each `enqueue` returns a promise that resolves (or rejects) once the queue has drained, so
 * callers can await durability. A failing write resets the queue so later writes still run.
 */
export type WriteQueue<T> = {
	enqueue(value: T): Promise<void>
}

export function createWriteQueue<T>(write: (value: T) => Promise<void>): WriteQueue<T> {
	// `pending` holds the latest value awaiting a write, or `null` when nothing is queued. A newer
	// `enqueue` overwrites it, which is exactly how superseded values get dropped.
	let pending: { value: T } | null = null
	let draining: Promise<void> | null = null

	async function drain(): Promise<void> {
		while (pending !== null) {
			const next = pending.value
			pending = null
			await write(next)
		}
	}

	function enqueue(value: T): Promise<void> {
		pending = { value }
		draining ??= drain().finally(() => {
			draining = null
		})
		return draining
	}

	return { enqueue }
}
