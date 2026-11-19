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
	type Drain = { promise: Promise<void>; resolve(): void; reject(error: unknown): void }
	let draining: Drain | null = null

	async function drain(owner: Drain): Promise<void> {
		try {
			while (pending !== null) {
				const next = pending.value
				pending = null
				await write(next)
			}
		} catch (error) {
			pending = null
			draining = null
			owner.reject(error)
			return
		}
		// Release ownership in the same turn that observes an empty queue. A later enqueue
		// must start a new drain, even before this owner's Promise reactions have run.
		draining = null
		owner.resolve()
	}

	function enqueue(value: T): Promise<void> {
		pending = { value }
		if (draining) return draining.promise
		let resolve!: () => void
		let reject!: (error: unknown) => void
		const promise = new Promise<void>((yes, no) => {
			resolve = yes
			reject = no
		})
		const owner = { promise, resolve, reject }
		draining = owner
		void drain(owner)
		return promise
	}

	return { enqueue }
}
