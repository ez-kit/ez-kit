import { useRef, useState } from 'react'

import { useSafeLayoutEffect } from '../utils/use-safe-layout-effect'

import { useDataGridInstance, useDataGridStore } from './table-context'

const LEFT_PINNED_CELL = "[data-slot='th'][data-pinned='left']"
const RIGHT_PINNED_CELL = "[data-slot='th'][data-pinned='right']"

type PinnedEdges = {
	left: number | null
	right: number | null
}

const NO_EDGES: PinnedEdges = { left: null, right: null }

/**
 * Measures where the pinned blocks actually END in the DOM, relative to the overlay.
 *
 * The summed model widths (`Σ col.getSize()`) are NOT that offset: the scroll container
 * may sit inset from the wrapper by its own border/padding (HeroUI's `.table-root` insets
 * it by 4px), and a kit's rendered column widths can diverge from the model. Both errors
 * push the shadow *under* the sticky pinned cells — which paint above the overlay
 * (`z-index: 1` vs. the overlay's `auto`), so the darkest few pixels of the shadow are
 * hidden and only its faint tail survives. That is the whole bug: the shadow renders, it
 * is just covered.
 *
 * Returns `null` per side when there is nothing to measure (no pinned cell, or a zero-size
 * layout as in jsdom) so the caller can fall back to the model offsets.
 */
function measurePinnedEdges(overlay: HTMLElement): PinnedEdges {
	const box = overlay.getBoundingClientRect()
	if (box.width === 0) return NO_EDGES

	const scope = overlay.parentElement ?? overlay
	const leftCells = scope.querySelectorAll<HTMLElement>(LEFT_PINNED_CELL)
	const lastLeft = leftCells[leftCells.length - 1]
	const firstRight = scope.querySelector<HTMLElement>(RIGHT_PINNED_CELL)

	return {
		left: lastLeft ? lastLeft.getBoundingClientRect().right - box.left : null,
		right: firstRight ? box.right - firstRight.getBoundingClientRect().left : null,
	}
}

/**
 * Renders the overlay that shows scroll shadows alongside pinned columns.
 *
 * The wrapper carries `data-slot="pin-shadow-overlay"` and fills the whole table
 * wrapper (`inset: 0`) — it is a non-collapsing layer, never sized to the gap
 * between the pinned blocks.
 *
 * Each shadow div uses `data-pin-shadow="left" | "right"` and carries its OWN
 * pixel offset as an inline style: the left shadow sits at the right edge of the
 * left-pinned block, the right shadow at the left edge of the right-pinned block.
 * Those offsets are **measured from the DOM** (see `measurePinnedEdges`), with the
 * summed model widths as the pre-measurement fallback. Positioning each shadow
 * independently (rather than sizing one shared overlay to `[leftSize … width −
 * rightSize]`) is what keeps both shadows visible when the combined pinned width
 * approaches the viewport — otherwise the shared box would collapse to zero width
 * and `overflow: hidden` would clip both shadows.
 *
 * The actual visual shadow (box-shadow, opacity, transition) lives in each UI
 * kit's stylesheet, since it's a visual choice; structural positioning
 * (`position`, `top`/`bottom`, `inset`) lives in the shared structural stylesheet
 * (`@ez-kit/data-grid-react/styles.css`).
 *
 * CSS vars `--dg-pin-left-shadow` / `--dg-pin-right-shadow` (0 or 1) on the
 * table wrapper drive the shadow opacity.
 *
 * Subscribes only to the layout slices it actually reflects — left/right column
 * sets (from `columnPinning` + `columnVisibility`) and their widths
 * (`columnSizing`). Editing / sorting / pagination etc. don't touch these.
 */
export function PinShadowOverlay() {
	const instance = useDataGridInstance()
	const table = instance.table

	useDataGridStore((s) => s.columnPinning)
	useDataGridStore((s) => s.columnVisibility)
	useDataGridStore((s) => s.columnSizing)

	const overlayRef = useRef<HTMLDivElement>(null)
	const [edges, setEdges] = useState<PinnedEdges>(NO_EDGES)

	const leftCols = table.getLeftLeafColumns()
	const rightCols = table.getRightLeafColumns()

	const leftSize = leftCols.reduce((acc, col) => acc + col.getSize(), 0)
	const rightSize = rightCols.reduce((acc, col) => acc + col.getSize(), 0)

	// Re-measure on every layout change that can move a pinned edge: pin/unpin and column
	// resize come in through the model sizes below; container resizes (and the kit's own
	// late layout passes) come in through the ResizeObserver.
	useSafeLayoutEffect(() => {
		const overlay = overlayRef.current
		if (!overlay) return

		const sync = () => {
			const next = measurePinnedEdges(overlay)
			setEdges((prev) => (prev.left === next.left && prev.right === next.right ? prev : next))
		}

		sync()
		const observer = new ResizeObserver(sync)
		observer.observe(overlay)
		const scope = overlay.parentElement
		if (scope) observer.observe(scope)
		return () => {
			observer.disconnect()
		}
	}, [leftSize, rightSize, leftCols.length, rightCols.length])

	if (leftCols.length === 0 && rightCols.length === 0) return null

	return (
		<div
			ref={overlayRef}
			aria-hidden
			data-slot='pin-shadow-overlay'
		>
			{leftCols.length > 0 && (
				<div
					data-pin-shadow='left'
					style={{ left: edges.left ?? leftSize }}
				/>
			)}
			{rightCols.length > 0 && (
				<div
					data-pin-shadow='right'
					style={{ right: edges.right ?? rightSize }}
				/>
			)}
		</div>
	)
}
