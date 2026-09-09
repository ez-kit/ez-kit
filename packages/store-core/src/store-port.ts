/**
 * The contract a store manager fulfils so manager-agnostic machinery (the persist engine, above
 * all) can read, write and observe a store without importing Valtio or Zustand.
 *
 * It is deliberately three operations wide. Anything richer would leak one manager's model into
 * the other: Valtio's store IS its state and is written by mutation, Zustand's store is a handle
 * whose state is replaced wholesale, and the only thing both can honestly promise is "hand me the
 * current state object", "apply these leaf writes", "tell me when something changed".
 */

/** One leaf assignment: where to write, and what. */
export type PathWrite = {
	/** Ordered property segments from the state root to the leaf. */
	path: readonly string[]
	value: unknown
}

export type StorePort<TStore extends object = object> = {
	/**
	 * The plain state object to read through. For Valtio this is the proxy itself (reads must see
	 * live values, not a snapshot); for Zustand it is `store.getState()`.
	 */
	getState(store: TStore): object
	/**
	 * Apply `writes` to the store. Callers pass every leaf they want changed in one call, so a
	 * manager that notifies per state replacement produces ONE notification for the batch — a
	 * hydration touching five fields must not look like five separate changes. An empty list is a
	 * no-op that must not notify at all.
	 */
	write(store: TStore, writes: readonly PathWrite[]): void
	/** Observe changes to the store's state. Returns the unsubscribe function. */
	subscribe(store: TStore, onChange: () => void): () => void
}
