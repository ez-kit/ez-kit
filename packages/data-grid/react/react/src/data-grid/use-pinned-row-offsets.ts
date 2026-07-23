import { useCallback, useEffect, useRef, useState } from 'react'

/** Edge a pinned row sticks to — decides which neighbours stack between it and the viewport. */
export type PinSide = 'top' | 'bottom'

/**
 * Measures pinned rows and publishes each one's sticky offset as `--dg-row-pin-offset`, consumed
 * by the structural stylesheet.
 *
 * A row's offset is the summed height of the pinned rows stacked between it and the viewport edge,
 * read from the DOM. It used to be `index * 49px` — a guessed row height. Any kit whose rows are a
 * different height drifts by the difference per row, leaving a transparent band between pinned rows
 * that the scrolling content shows through (HeroUI's rows are 46px, so 3px per row — #140). A single
 * constant also cannot describe rows of unequal height (wrapped text, an editing row) in any kit.
 *
 * Returns a ref-callback factory: pass `registerRow(index)` as the row's ref. The callbacks are
 * cached per index so they stay referentially stable across renders — a fresh function each render
 * would detach and re-attach every row on every render.
 */
export function usePinnedRowOffsets(
	side: PinSide,
	count: number,
): (index: number) => (node: HTMLTableRowElement | null) => void {
	const nodesRef = useRef(new Map<number, HTMLTableRowElement>())
	const callbacksRef = useRef(new Map<number, (node: HTMLTableRowElement | null) => void>())
	const [attachedVersion, setAttachedVersion] = useState(0)

	const registerRow = useCallback((index: number) => {
		const cached = callbacksRef.current.get(index)
		if (cached) return cached

		const callback = (node: HTMLTableRowElement | null) => {
			if (node) nodesRef.current.set(index, node)
			else nodesRef.current.delete(index)
			setAttachedVersion((version) => version + 1)
		}
		callbacksRef.current.set(index, callback)
		return callback
	}, [])

	useEffect(() => {
		const nodes: HTMLTableRowElement[] = []
		for (let index = 0; index < count; index++) {
			const node = nodesRef.current.get(index)
			if (node) nodes.push(node)
		}
		if (nodes.length === 0) return

		const measure = () => {
			let offset = 0
			// Top rows stack downwards from the first, bottom rows upwards from the last.
			const ordered = side === 'top' ? nodes : [...nodes].reverse()
			for (const node of ordered) {
				node.style.setProperty('--dg-row-pin-offset', `${String(offset)}px`)
				offset += node.offsetHeight
			}
		}
		measure()

		const ro = new ResizeObserver(measure)
		for (const node of nodes) ro.observe(node)
		return () => {
			ro.disconnect()
		}
	}, [side, count, attachedVersion])

	return registerRow
}
