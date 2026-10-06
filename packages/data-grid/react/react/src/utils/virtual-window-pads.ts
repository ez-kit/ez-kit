/** The vertical span the virtualizer's window occupies inside the body's total scroll height. */
export type VirtualWindowSpan = {
	/** Offset of the window's first row from the top of the list, in px. */
	start: number
	/** Offset of the bottom edge of the window's last row, in px. */
	end: number
}

/** The two paddings that place a windowed, in-flow band inside the body's total scroll height. */
export type VirtualWindowPads = {
	before: number
	after: number
}

const NO_PADS: VirtualWindowPads = { before: 0, after: 0 }

/**
 * Where the window's band sits, expressed as the padding above and below it.
 *
 * This replaced a per-row `transform: translateY(start)`. The transform took every row out of flow,
 * which left the drag library's own displacement inert: it reorders DOM nodes and FLIP-animates the
 * layout change that follows, and out of flow there is no layout change to animate. Measured, the
 * neighbours of a dragged row did not move by a pixel. In flow they do, with no optimistic state
 * and no change to the drag port.
 *
 * **The pads stay on the container even though pinned rows share the tbody, and that is measured
 * rather than overlooked.** A pinned row is `position: sticky`, so it is in flow, and the top band
 * sits ahead of the window's — which means `padding-top` lands before it and the band is displaced
 * downwards by the pinned-top rows' height. **While the header is sticky** — `layout.stickyHeader`,
 * which is where this was measured — the displacement is exactly the height that band overlays once
 * it sticks below the header, so the first centre row the user can see sits at the offset the
 * virtualizer computed from `scrollTop` and no `scrollMargin` term is needed; measured at
 * `scrollTop` 0, 4900 and the end of the range, in both kits, with the row-to-row gap exact at every
 * one. The two terms are displacement and occlusion and they cancel by construction, but only under
 * that condition: with `layout.stickyHeader: false` the pinned band sticks at the scrollport's own
 * edge rather than below the header, and the first visible centre offset comes out `theadH` short of
 * `scrollTop`. Moving the offset onto the band's edge rows as margins — the obvious alternative —
 * fixes nothing, because the pinned rows precede the first window row either way.
 *
 * The tbody then exceeds `totalSize` by the pinned rows' height, which is them paying for
 * themselves: a pinned row leaves `getCenterRows()`, so it leaves the virtualizer's count. Note the
 * tbody grows by their **measured** height while `totalSize` dropped their **estimate**, so the
 * excess is the difference, not zero — in heroui the two pinned rows measure 58 and 57 against a
 * 49px `estimateSize`, so the tbody is `+17`, and the scrollport's `scrollHeight` came out 15px over
 * the same grid with nothing pinned (490 054 against 490 039). **That is a sound result with a
 * reason, not a rounding error**, and an earlier revision of this docblock calling it "within a
 * pixel" both understated it and invited a later reader to distrust a measurement that is correct.
 * The remaining 2px between the two figures is not accounted for here; it is well inside what one
 * row's measurement differs from its estimate by, and nothing depends on either number.
 *
 * `undefined` for an empty window — not `{ before: 0, after: totalSize }`. The caller reserves the
 * total size on the tbody regardless, and a grid whose rows arrive after mount renders one frame
 * with no window; padding the whole list into existence there would make the scrollport jump.
 */
export function resolveVirtualWindowPads(
	windowSpan: VirtualWindowSpan | undefined,
	totalSize: number,
): VirtualWindowPads {
	if (!windowSpan) return NO_PADS

	return {
		before: Math.max(windowSpan.start, 0),
		after: Math.max(totalSize - windowSpan.end, 0),
	}
}
