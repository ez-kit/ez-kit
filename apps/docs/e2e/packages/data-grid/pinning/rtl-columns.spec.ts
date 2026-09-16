import { boxOf, expect, test } from '../../../fixtures'

/**
 * Column pinning under RTL, on the `column-pinning-rtl` example: `name` is pinned `start` and
 * `stock` is pinned `end`, inside a `dir="rtl"` wrapper with `direction: 'rtl'` on the grid.
 *
 * This is the case the whole `left`/`right` -> `start`/`end` rename exists for, and the one
 * nothing covered before it: `start` and `end` are logical, so the physical edge each one
 * sticks to flips here. `columns.spec.ts` proves pinning works; it cannot tell a logical
 * implementation from a physical one, because in LTR the two agree on everything.
 *
 * Every assertion below is stated as a *relation* between the two pinned columns rather than
 * as an absolute coordinate, so it fails on an LTR layout instead of being satisfied by one.
 */

const EXAMPLE = 'column-pinning-rtl'
const PINNED_START = 'name'
const PINNED_END = 'stock'
const FREE = 'status'

// The five columns add up to 1100px, so the grid only overflows — and pinning only does
// anything — in a viewport narrower than that.
test.use({ viewport: { width: 800, height: 700 } })

/** Negative: under RTL the scrollport's `scrollLeft` runs from 0 towards the inline end. */
const SCROLL_BY = -200
/** Sub-pixel drift from layout rounding; a real shift is the full scroll distance. */
const TOLERANCE = 1

test.beforeEach(async ({ grid }) => {
	await grid.open(EXAMPLE)
})

test('the logical side reaches the DOM unchanged by the direction', async ({ grid }) => {
	// `data-pinned` names the axis, not the edge — so it reads the same under RTL as under LTR.
	// What moves is where the browser puts the cell, which the next test measures.
	await expect(grid.header(PINNED_START)).toHaveAttribute('data-pinned', 'start')
	await expect(grid.header(PINNED_END)).toHaveAttribute('data-pinned', 'end')
	await expect(grid.header(FREE)).not.toHaveAttribute('data-pinned', /.*/u)
})

test('a start-pinned column sticks to the right edge and an end-pinned one to the left', async ({ grid }) => {
	const start = await boxOf(grid.header(PINNED_START))
	const end = await boxOf(grid.header(PINNED_END))

	// Under LTR this is the other way round, so an implementation that kept `left:` /
	// `right:` — or that resolved the sides physically — fails here and only here.
	expect(start.x).toBeGreaterThan(end.x)
	expect(end.x + end.width).toBeLessThanOrEqual(start.x + TOLERANCE)
})

test('both pinned columns hold their place while the table scrolls under them', async ({ grid }) => {
	const startBefore = await boxOf(grid.header(PINNED_START))
	const endBefore = await boxOf(grid.header(PINNED_END))
	const freeBefore = await boxOf(grid.header(FREE))

	await grid.scrollBy({ x: SCROLL_BY })

	const startAfter = await boxOf(grid.header(PINNED_START))
	const endAfter = await boxOf(grid.header(PINNED_END))
	const freeAfter = await boxOf(grid.header(FREE))

	expect(Math.abs(startAfter.x - startBefore.x)).toBeLessThanOrEqual(TOLERANCE)
	expect(Math.abs(endAfter.x - endBefore.x)).toBeLessThanOrEqual(TOLERANCE)
	// The unpinned column moved by the full scroll distance, towards the right — proof the
	// container really scrolled, which is what makes the two assertions above mean anything.
	expect(freeAfter.x - freeBefore.x).toBeGreaterThan(Math.abs(SCROLL_BY) - TOLERANCE)
})
