import { useCallback, useEffect, useMemo, useRef, useSyncExternalStore } from 'react'
import { snapshot, subscribe, type Snapshot } from 'valtio'

export type UseSelectorOptions<TSelected> = {
	/** Result equality; defaults to Object.is. Equal results retain their previous reference. */
	isEqual?: (previous: TSelected, next: TSelected) => boolean
}

/**
 * Select from an immutable Valtio snapshot. Inline selectors are supported; only changes to the
 * selected result trigger store-driven renders. Fresh objects/arrays are cached per snapshot;
 * pass `isEqual: shallowEqual` to also skip equivalent results across store changes.
 */
export function useSelector<TState extends object, TSelected>(
	store: TState,
	selector: (snap: Snapshot<TState>) => TSelected,
	options?: UseSelectorOptions<TSelected>,
): TSelected {
	const isEqual = options?.isEqual ?? Object.is
	const committed = useRef<{ value: TSelected } | null>(null)
	const subscribeToStore = useCallback((notify: () => void) => subscribe(store, notify), [store])
	const getSelection = useMemo(
		() => createSelectionGetter(store, selector, isEqual, committed),
		[store, selector, isEqual],
	)
	const value = useSyncExternalStore(subscribeToStore, getSelection, getSelection)
	useEffect(() => {
		committed.current = { value }
	}, [value])
	return value
}

/** Each selector owns its cache so interrupted renders cannot replace a committed selector. */
function createSelectionGetter<TState extends object, TSelected>(
	store: TState,
	selector: (snap: Snapshot<TState>) => TSelected,
	isEqual: (previous: TSelected, next: TSelected) => boolean,
	committed: { current: { value: TSelected } | null },
): () => TSelected {
	let memo: { snap: Snapshot<TState>; value: TSelected } | undefined
	return () => {
		const snap = snapshot(store)
		if (memo && Object.is(memo.snap, snap)) return memo.value
		const next = selector(snap)
		const previous = memo ?? committed.current
		const value = previous && isEqual(previous.value, next) ? previous.value : next
		memo = { snap, value }
		return value
	}
}
