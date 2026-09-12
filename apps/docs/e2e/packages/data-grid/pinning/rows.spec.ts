import { boxOf, expect, test } from '../../../fixtures'

/**
 * Row pinning on the `row-pinning-initial` example: 60 rows in a 24rem-tall scroller, with
 * `initialState.rowPinning` holding row `3` to the top and row `58` to the bottom.
 *
 * Seeded pinning is used rather than clicking a pin control on purpose — this spec is about
 * where a pinned row *stays*, which is layout, and the control that pins it belongs to the
 * row-actions spec.
 */

const EXAMPLE = 'row-pinning-initial'
const TOP_ROW = '3'
const BOTTOM_ROW = '58'

const SCROLL_BY = 600
const TOLERANCE = 1

test.beforeEach(async ({ grid }) => {
	await grid.open(EXAMPLE)
})

test('the seeded rows are the pinned ones', async ({ page }) => {
	const pinned = page.locator('[data-slot="tr"][data-pinned]')
	await expect(pinned).toHaveCount(2)
	await expect(page.locator(`[data-slot="tr"][data-row-id="${TOP_ROW}"]`)).toHaveAttribute('data-pinned', 'top')
	await expect(page.locator(`[data-slot="tr"][data-row-id="${BOTTOM_ROW}"]`)).toHaveAttribute('data-pinned', 'bottom')
})

test('a pinned row is lifted out of its natural position', async ({ grid }) => {
	const ids = await grid.rows().evaluateAll((rows) => rows.map((row) => row.getAttribute('data-row-id')))

	// Row 3 would sit third in an unsorted 1..60 list and row 58 third from the end; pinning
	// moves them to the ends of the body instead.
	expect(ids[0]).toBe(TOP_ROW)
	expect(ids.at(-1)).toBe(BOTTOM_ROW)
})

test('pinned rows stay put while the body scrolls', async ({ grid, page }) => {
	const top = page.locator(`[data-slot="tr"][data-row-id="${TOP_ROW}"]`)
	const bottom = page.locator(`[data-slot="tr"][data-row-id="${BOTTOM_ROW}"]`)
	const free = page.locator('[data-slot="tr"][data-row-id="1"]')

	const topBefore = await boxOf(top)
	const bottomBefore = await boxOf(bottom)
	const freeBefore = await boxOf(free)

	await grid.scrollBy({ y: SCROLL_BY })

	const topAfter = await boxOf(top)
	const bottomAfter = await boxOf(bottom)
	const freeAfter = await boxOf(free)

	expect(Math.abs(topAfter.y - topBefore.y)).toBeLessThanOrEqual(TOLERANCE)
	expect(Math.abs(bottomAfter.y - bottomBefore.y)).toBeLessThanOrEqual(TOLERANCE)
	// An ordinary row moved the full distance — the scroll happened, and pinning is what kept
	// the other two where they were.
	expect(freeBefore.y - freeAfter.y).toBeGreaterThan(SCROLL_BY - TOLERANCE)
})
