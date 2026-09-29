import type { Ref, RefCallback } from 'react'

/**
 * One element, two refs.
 *
 * This package had no such helper because until row dragging nothing needed one: a `<tr>` carries
 * the measurement ref `virtual-body.tsx` hands it for pinned-row offsets, and the drag adapter
 * wants the same element as the thing that moves. Both have to land.
 *
 * **Memoise the result at the call site.** React calls a *changed* ref callback with `null` and
 * then with the node, so a fresh merge every render detaches and reattaches both refs — for the
 * drag adapter that means the draggable is re-registered mid-gesture.
 */
export function mergeRefs<T>(...refs: (Ref<T> | undefined)[]): RefCallback<T> {
	return (node) => {
		for (const ref of refs) {
			if (typeof ref === 'function') ref(node)
			else if (ref) ref.current = node
		}
	}
}
