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
