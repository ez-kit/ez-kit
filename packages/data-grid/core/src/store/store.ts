type Listener = () => void

export type SetStateOptions = {
	/**
	 * Swap the state in without calling listeners. The caller becomes responsible
	 * for calling {@link Store.notify} once it is safe to do so. Exists for writes
	 * that happen during a React render pass, where notifying would set state on a
	 * subscribed component mid-render.
	 */
	silent?: boolean
}

export type Store<S> = {
	getState: () => S
	setState: (next: S | ((prev: S) => S), options?: SetStateOptions) => void
	/** Call every listener with the current state. Pairs with a `silent` write. */
	notify: () => void
	subscribe: (listener: Listener) => () => void
}

export function createStore<S>(initial: S): Store<S> {
	let state = initial
	const listeners = new Set<Listener>()

	function notify(): void {
		listeners.forEach((l) => {
			l()
		})
	}

	return {
		getState: () => state,
		setState: (next, options) => {
			state = typeof next === 'function' ? (next as (prev: S) => S)(state) : next
			if (!options?.silent) notify()
		},
		notify,
		subscribe: (listener) => {
			listeners.add(listener)
			return () => {
				listeners.delete(listener)
			}
		},
	}
}
