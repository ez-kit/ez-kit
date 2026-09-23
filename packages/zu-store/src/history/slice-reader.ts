/**
 * The `partialize` each history sub-store was built with, so `useTimeline` can shape `current` like
 * a step. Kept here rather than on the sub-store's state because that state is public: a reader
 * there would be API, and a function nobody but this package's own hook should call.
 */
const sliceReaders = /* @__PURE__ */ new WeakMap<object, (state: never) => unknown>()

export function registerSliceReader(history: object, partialize: (state: never) => unknown): void {
	sliceReaders.set(history, partialize)
}

/** `history`'s slice of `state` — the state itself when the store was built without `partialize`. */
export function readSlice(history: object, state: unknown): unknown {
	const partialize = sliceReaders.get(history) as ((state: unknown) => unknown) | undefined
	return partialize ? partialize(state) : state
}
