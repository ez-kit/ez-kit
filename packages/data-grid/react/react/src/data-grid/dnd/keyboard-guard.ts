import { useCallback, useRef } from 'react'

import { COLUMN_DRAGGING_SELECTOR, SORT_DRAGGING_SELECTOR } from './dragging-attrs'

/** The phase the guard listens in: on the document, ahead of every handler React dispatches. */
const CAPTURE = true

/**
 * The key the guard always lets through. The pointer sensor reads it on the document in the bubble
 * phase to cancel a mouse drag, and a key stopped in the capture phase never gets there.
 */
const CANCEL_KEY = 'Escape'

/** Whether an event target is a DOM node, by shape rather than `instanceof`, which fails across frames. */
function isNode(target: EventTarget | null): target is Node {
	return target !== null && typeof (target as Partial<Node>).nodeType === 'number'
}

/**
 * Keep keys away from a kit's **collection** while a column panel row inside it is being dragged.
 *
 * For a kit whose column panel is a react-aria collection (`GridList`, `ListBox`). Such a collection
 * handles the arrow keys and `Space` itself — it moves focus between rows and toggles a row's
 * selection — and a keyboard drag uses the same keys, so without this both act on one press. In a
 * `GridList` panel that was measured as one `ArrowDown` moving the row two places, and, with the
 * collection's navigation switched to `tab`, the `Space` that drops the row also toggling a column's
 * visibility. A panel of plain elements has no second handler and does not need it.
 *
 * Returns a ref for the collection's root element. While that element contains a row carrying the
 * dragging attribute, a `keydown` aimed inside it is stopped before any React handler sees it; at any
 * other time, and for a key aimed anywhere else, it does nothing. `Escape` always passes: it is how
 * either drag is cancelled, and the pointer sensor reads it in the bubble phase, past any key stopped
 * here. The collection must not act on it either — the HeroUI panel sets `disallowEmptySelection`
 * for exactly that.
 *
 * **Why the listener sits on the document and not on the collection.** The second step came from a
 * react-aria row's **capture** handler: on an arrow pressed on a control inside the row, it stops the
 * key and dispatches a fresh one at the collection, so the collection can move focus — and the drag
 * library, which reads keys on the document, saw that fresh key as a second press. React runs capture
 * handlers at its root or portal container, above the collection, so a listener on the collection
 * runs too late to prevent the re-dispatch. On the document in the capture phase it runs before React
 * does. `stopPropagation` there keeps the key from every node below, while the drag library's own
 * document listener still receives it: stopping propagation does not skip other listeners on the
 * same node.
 *
 * **Why a ref rather than an `onKeyDownCapture` prop:** react-aria's collections and `Dialog` drop
 * the prop silently, so a kit would have to add a wrapper element just to carry it — the element the
 * render-function form of `<DataGrid.VisibilityItem>` exists to remove. The ref also scopes the guard
 * to one collection, so two panels on a page do not stop each other's keys.
 *
 * Both halves — one press is one step, and the drop toggles nothing — are measured by the browser
 * suite (`column-panel-keyboard.spec.ts`), not assumed here. The attribute is read from
 * `dragging-attrs.ts` and nothing from the drag stack is imported, so a kit block calling this pays
 * for no adapter.
 */
export function useColumnDragKeyboardGuard(): (node: HTMLElement | null) => void {
	return useDragKeyboardGuard(COLUMN_DRAGGING_SELECTOR)
}

/**
 * {@link useColumnDragKeyboardGuard} for the sort builder's list of entries: keeps keys away from
 * the controls of the builder — an entry's selects, a collection the kit renders the entries in —
 * while one of its entries is being dragged from the keyboard. `Escape` passes, for the same reason.
 *
 * Returns a ref for the element that holds the entries' rows.
 */
export function useSortDragKeyboardGuard(): (node: HTMLElement | null) => void {
	return useDragKeyboardGuard(SORT_DRAGGING_SELECTOR)
}

/** The guard both surfaces share, keyed on the selector that finds their dragged row. */
function useDragKeyboardGuard(draggingSelector: string): (node: HTMLElement | null) => void {
	/*
	 * The detach lives in a ref rather than in a cleanup returned from the callback, because the
	 * package supports React 18, which calls a callback ref with `null` and ignores what it returns.
	 */
	const detachRef = useRef<(() => void) | null>(null)

	return useCallback(
		(node: HTMLElement | null) => {
			detachRef.current?.()
			detachRef.current = null
			if (node === null) return

			const document = node.ownerDocument
			const onKeyDown = (event: KeyboardEvent) => {
				if (event.key === CANCEL_KEY || !isNode(event.target) || !node.contains(event.target)) return
				if (node.querySelector(draggingSelector)) event.stopPropagation()
			}
			document.addEventListener('keydown', onKeyDown, CAPTURE)
			detachRef.current = () => {
				document.removeEventListener('keydown', onKeyDown, CAPTURE)
			}
		},
		[draggingSelector],
	)
}
