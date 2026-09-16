import { GridDirection } from '@ez-kit/data-grid-core'
import { useRef, useState } from 'react'

import { useSafeLayoutEffect } from '../utils/use-safe-layout-effect'

import { useDataGridTable, useDataGridState } from './table-context'

const START_PINNED_CELL = "[data-slot='th'][data-pinned='start']"
const END_PINNED_CELL = "[data-slot='th'][data-pinned='end']"

/**
 * Distances from the overlay's own inline-start / inline-end edge — logical, not physical:
 * under RTL the start-pinned block sits against the right of the viewport, and these two
 * numbers are unchanged by that. They are applied as `inset-inline-start` / `inset-inline-end`,
 * which the browser resolves per direction.
 */
type PinnedEdges = {
	start: number | null
	end: number | null
}

const NO_EDGES: PinnedEdges = { start: null, end: null }

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
 *
 * `getBoundingClientRect` is in viewport coordinates, which are physical, while the offsets
 * this returns are logical — so the direction has to be applied here, once, rather than left
 * for the CSS to sort out. Under RTL the inline-start edge of the overlay is its `right`, and
 * the start-pinned block ends at its `left`.
 */
function measurePinnedEdges(overlay: HTMLElement, isRtl: boolean): PinnedEdges {
	const box = overlay.getBoundingClientRect()
	if (box.width === 0) return NO_EDGES

	const scope = overlay.parentElement ?? overlay
	// DOM order is always [...start, ...centre, ...end], whatever the direction, so the last
	// start-pinned header is the innermost one on that side in both.
	const startCells = scope.querySelectorAll<HTMLElement>(START_PINNED_CELL)
	const lastStart = startCells[startCells.length - 1]
	const firstEnd = scope.querySelector<HTMLElement>(END_PINNED_CELL)

	if (isRtl) {
		return {
			start: lastStart ? box.right - lastStart.getBoundingClientRect().left : null,
			end: firstEnd ? firstEnd.getBoundingClientRect().right - box.left : null,
		}
	}
	return {
		start: lastStart ? lastStart.getBoundingClientRect().right - box.left : null,
		end: firstEnd ? box.right - firstEnd.getBoundingClientRect().left : null,
	}
}

/**
 * Renders the overlay that shows scroll shadows alongside pinned columns.
 *
 * The wrapper carries `data-slot="pin-shadow-overlay"` and fills the whole table
 * wrapper (`inset: 0`) — it is a non-collapsing layer, never sized to the gap
 * between the pinned blocks.
 *
 * Each shadow div uses `data-pin-shadow="start" | "end"` and carries its OWN
 * pixel offset as an inline style — `inset-inline-start` / `inset-inline-end`, so
 * the pair flips with the writing direction rather than needing a second rule. The
 * start shadow sits at the inner edge of the start-pinned block, the end shadow at
 * the inner edge of the end-pinned block.
 * Those offsets are **measured from the DOM** (see `measurePinnedEdges`), with the
 * summed model widths as the pre-measurement fallback. Positioning each shadow
 * independently (rather than sizing one shared overlay to `[startSize … width −
 * endSize]`) is what keeps both shadows visible when the combined pinned width
 * approaches the viewport — otherwise the shared box would collapse to zero width
 * and `overflow: hidden` would clip both shadows.
 *
 * The actual visual shadow (box-shadow, opacity, transition) lives in each UI
 * kit's stylesheet, since it's a visual choice; structural positioning
 * (`position`, `top`/`bottom`, `inset`) lives in the shared structural stylesheet
 * (`@ez-kit/data-grid-react/styles.css`).
 *
 * CSS vars `--dg-pin-start-shadow` / `--dg-pin-end-shadow` (0 or 1) on the
 * table wrapper drive the shadow opacity.
 *
 * Subscribes only to the layout slices it actually reflects — start/end column
 * sets (from `columnPinning` + `columnVisibility`) and their widths
 * (`columnSizing`). Editing / sorting / pagination etc. don't touch these.
 */
export function PinShadowOverlay() {
	const table = useDataGridTable()

	useDataGridState((s) => s.columnPinning)
	useDataGridState((s) => s.columnVisibility)
	useDataGridState((s) => s.columnSizing)

	const overlayRef = useRef<HTMLDivElement>(null)
	const [edges, setEdges] = useState<PinnedEdges>(NO_EDGES)

	const startCols = table.getStartLeafColumns()
	const endCols = table.getEndLeafColumns()

	const startSize = startCols.reduce((acc, col) => acc + col.getSize(), 0)
	const endSize = endCols.reduce((acc, col) => acc + col.getSize(), 0)
	const isRtl = table.grid.direction === GridDirection.Rtl

	// Re-measure on every layout change that can move a pinned edge: pin/unpin and column
	// resize come in through the model sizes below; container resizes (and the kit's own
	// late layout passes) come in through the ResizeObserver.
	useSafeLayoutEffect(() => {
		const overlay = overlayRef.current
		if (!overlay) return

		const sync = () => {
			const next = measurePinnedEdges(overlay, isRtl)
			setEdges((prev) => (prev.start === next.start && prev.end === next.end ? prev : next))
		}

		sync()
		const observer = new ResizeObserver(sync)
		observer.observe(overlay)
		const scope = overlay.parentElement
		if (scope) observer.observe(scope)
		return () => {
			observer.disconnect()
		}
	}, [startSize, endSize, startCols.length, endCols.length, isRtl])

	if (startCols.length === 0 && endCols.length === 0) return null

	return (
		<div
			ref={overlayRef}
			aria-hidden
			data-slot='pin-shadow-overlay'
		>
			{startCols.length > 0 && (
				<div
					data-pin-shadow='start'
					style={{ insetInlineStart: edges.start ?? startSize }}
				/>
			)}
			{endCols.length > 0 && (
				<div
					data-pin-shadow='end'
					style={{ insetInlineEnd: edges.end ?? endSize }}
				/>
			)}
		</div>
	)
}
