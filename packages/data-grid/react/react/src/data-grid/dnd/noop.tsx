import type { DndAdapter, DndProviderProps, SortableItemHandle } from './types'

/** A ref callback that does nothing. Hoisted so the inert handle keeps one identity. */
const NOOP_REF = (): void => {}

/**
 * The handle every item gets when no adapter is registered.
 *
 * Module-level and frozen on purpose: `useSortableItem` returns **this object**, so a grid with no
 * DnD — which is every grid today and most grids after — never invalidates a `useMemo` or re-runs
 * a `useEffect` keyed on the handle. A fresh object per call would do both, in the grids that get
 * nothing out of it.
 */
const INERT: SortableItemHandle = Object.freeze({
	ref: NOOP_REF,
	handleRef: NOOP_REF,
	isDragging: false,
})

function NoopProvider({ children }: DndProviderProps) {
	return <>{children}</>
}

/**
 * What a grid runs on when its bundle was built without `dnd`.
 *
 * Not a context default — the contexts default to `null`, because "no DnD here" and "an adapter is
 * registered" have to be distinguishable for `useDndEnabled`, which is what a drag handle renders
 * behind. This is applied at the `useSortableItem` call instead, so the hook is called
 * unconditionally either way.
 */
export const noopDndAdapter: DndAdapter = {
	Provider: NoopProvider,
	useSortableItem: () => INERT,
}
