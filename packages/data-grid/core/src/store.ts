type Listener = () => void

export type Store<S> = {
	getState: () => S
	setState: (next: S | ((prev: S) => S)) => void
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
		setState: (next) => {
			state = typeof next === 'function' ? (next as (prev: S) => S)(state) : next
			notify()
		},
		subscribe: (listener) => {
			listeners.add(listener)
			return () => {
				listeners.delete(listener)
			}
		},
	}
}
