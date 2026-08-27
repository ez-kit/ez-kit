import { useCallback, useRef } from 'react'

import { useSafeLayoutEffect } from '../utils/use-safe-layout-effect'

/**
 * Edge a pinned row sticks to — decides which neighbours stack between it and the viewport.
 *
 * Named members for internal reference; the plain string union is what callers see. Distinct
 * from the core `ColumnPinSide` (`left` / `right`): rows pin vertically, columns horizontally.
 */
export const PinSide = {
	/** Stacked under the sticky header. */
	Top: 'top',
	/** Stacked above the table's bottom edge. */
	Bottom: 'bottom',
} as const

export type PinSide = (typeof PinSide)[keyof typeof PinSide]

/** CSS custom property consumed by the structural stylesheet to position a pinned row. */
const PIN_OFFSET_VAR = '--dg-row-pin-offset'

/** Separator for the effect key: NUL cannot appear in a row id produced by getRowId. */
const KEY_SEPARATOR = String.fromCharCode(0)

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
 * Rows are re-measured from two independent triggers, and both are needed:
 *
 * - the pinned ids changing, which re-runs the effect. Keying on the ids rather than on their count
 *   is what lets "unpin A, pin B" — same count, different nodes — be noticed at all.
 * - a row's ref attaching or detaching, which schedules a re-run on a microtask. A kit whose `Tbody`
 *   is a react-aria collection (HeroUI) renders the real `<tr>` in a later pass, so a freshly pinned
 *   row is *not* yet registered when the effect runs, and would otherwise never get an offset.
 *
 * The ref path deliberately schedules rather than setting state: the state this replaced re-rendered
 * the whole body — 100 rows and 500 cells — several times over for a single pin.
 *
 * Returns a ref-callback factory: pass `registerRow(index)` as the row's ref. The callbacks are
 * cached per index so they stay referentially stable across renders — a fresh function each render
 * would detach and re-attach every row on every render.
 */
export function usePinnedRowOffsets(
	side: PinSide,
	rowIds: readonly string[],
): (index: number) => (node: HTMLTableRowElement | null) => void {
	const nodesRef = useRef(new Map<number, HTMLTableRowElement>())
	const callbacksRef = useRef(new Map<number, (node: HTMLTableRowElement | null) => void>())
	/** Set while the effect is mounted; `null` afterwards, so a pending microtask becomes a no-op. */
	const setupRef = useRef<(() => void) | null>(null)
	const isScheduledRef = useRef(false)

	const scheduleSetup = useCallback(() => {
		if (isScheduledRef.current) return
		isScheduledRef.current = true
		queueMicrotask(() => {
			isScheduledRef.current = false
			setupRef.current?.()
		})
	}, [])

	const registerRow = useCallback(
		(index: number) => {
			const cached = callbacksRef.current.get(index)
			if (cached) return cached

			const callback = (node: HTMLTableRowElement | null) => {
				if (node) nodesRef.current.set(index, node)
				else nodesRef.current.delete(index)
				scheduleSetup()
			}
			callbacksRef.current.set(index, callback)
			return callback
		},
		[scheduleSetup],
	)

	const count = rowIds.length
	const rowKey = rowIds.join(KEY_SEPARATOR)

	// Runs before paint: the offset decides where a pinned row sits, so applying it in a passive
	// effect would show it stacked at 0 — overlapping its neighbour — for one frame.
	useSafeLayoutEffect(() => {
		let observer: ResizeObserver | null = null

		const setup = () => {
			const nodes: HTMLTableRowElement[] = []
			for (let index = 0; index < count; index++) {
				const node = nodesRef.current.get(index)
				if (node) nodes.push(node)
			}

			observer?.disconnect()
			observer = null
			if (nodes.length === 0) return

			// Top rows stack downwards from the first, bottom rows upwards from the last.
			const ordered = side === 'top' ? nodes : [...nodes].reverse()

			const measure = () => {
				// Read every height first, then write. Interleaving them forces a synchronous layout
				// per row, because each write invalidates the layout the next read needs.
				const heights = ordered.map((node) => node.offsetHeight)
				let offset = 0
				ordered.forEach((node, index) => {
					node.style.setProperty(PIN_OFFSET_VAR, `${String(offset)}px`)
					offset += heights[index] ?? 0
				})
			}
			measure()

			observer = new ResizeObserver(measure)
			for (const node of ordered) observer.observe(node)
		}

		setupRef.current = setup
		setup()

		return () => {
			setupRef.current = null
			observer?.disconnect()
		}
	}, [side, rowKey, count])

	return registerRow
}
