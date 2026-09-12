import { boxOf, expect, test } from '../../../fixtures'

/**
 * `layout.stickyHeader` / `layout.stickyFooter` on the `sticky-footer` example: 50 rows and a
 * totals row inside a 20rem-tall scrollport, with both ends pinned.
 *
 * Every assertion here is a measurement against the scrollport's own box rather than against
 * the page: what "sticky" means is that the header hugs the top edge of the element that
 * scrolls and the footer its bottom edge, whatever else moves. `data-sticky="true"` and a
 * computed `position: sticky` are necessary but say nothing about where the element lands,
 * which is the half that used to be unprovable — jsdom lays nothing out.
 */

const STICKY = 'sticky-footer'
/** Same columns and rows, no `layout` at all — the baseline for "sticky is doing this". */
const PLAIN = 'column-footers'

const SCROLL_BY = 500
/** Sub-pixel drift from layout rounding; a real shift is the whole scroll distance. */
const TOLERANCE = 1
/** Hugging an edge is not sharing a coordinate with it: a kit's own border sits in between. */
const EDGE_TOLERANCE = 2

test.describe('a grid with both ends sticky', () => {
	test.beforeEach(async ({ grid }) => {
		await grid.open(STICKY)
	})

	test('marks the header and positions both ends sticky', async ({ page }) => {
		const thead = page.locator('[data-slot="thead"]')
		await expect(thead).toHaveAttribute('data-sticky', 'true')

		const positions = await page
			.locator('[data-slot="thead"], [data-slot="tfoot"]')
			.evaluateAll((ends) => ends.map((end) => getComputedStyle(end).position))
		expect(positions).toEqual(['sticky', 'sticky'])
	})

	test('the header holds the top edge of the scrollport while rows pass under it', async ({ grid, page }) => {
		const thead = page.locator('[data-slot="thead"]')
		const firstRow = grid.rows().first()

		const headerBefore = await boxOf(thead)
		const rowBefore = await boxOf(firstRow)

		await grid.scrollBy({ y: SCROLL_BY })

		const headerAfter = await boxOf(thead)
		const rowAfter = await boxOf(firstRow)
		const port = await boxOf(page.locator('[data-scrollport~="y"]'))

		expect(Math.abs(headerAfter.y - headerBefore.y)).toBeLessThanOrEqual(TOLERANCE)
		expect(Math.abs(headerAfter.y - port.y)).toBeLessThanOrEqual(TOLERANCE)
		// The rows really moved — otherwise the header standing still would prove nothing.
		expect(rowBefore.y - rowAfter.y).toBeGreaterThan(SCROLL_BY - TOLERANCE)
	})

	test('the footer holds the bottom edge of the scrollport', async ({ grid, page }) => {
		const tfoot = page.locator('[data-slot="tfoot"]')
		const firstRow = grid.rows().first()

		const portBefore = await boxOf(page.locator('[data-scrollport~="y"]'))
		const footBefore = await boxOf(tfoot)
		const rowBefore = await boxOf(firstRow)
		const footBottom = footBefore.y + footBefore.height
		const portBottom = portBefore.y + portBefore.height
		expect(Math.abs(footBottom - portBottom)).toBeLessThanOrEqual(EDGE_TOLERANCE)

		await grid.scrollBy({ y: SCROLL_BY })

		const footAfter = await boxOf(tfoot)
		const rowAfter = await boxOf(firstRow)
		expect(Math.abs(footAfter.y - footBefore.y)).toBeLessThanOrEqual(TOLERANCE)
		// The same control the header test carries, for the same reason: a grid that scrolled
		// nowhere leaves the footer where it was too, and would pass without it. That is not
		// hypothetical — it is how this assertion survived `stickyFooter` being switched off.
		expect(rowBefore.y - rowAfter.y).toBeGreaterThan(SCROLL_BY - TOLERANCE)
	})
})

test('without the layout options neither end is sticky', async ({ grid, page }) => {
	await grid.open(PLAIN)

	await expect(page.locator('[data-slot="thead"]')).not.toHaveAttribute('data-sticky', 'true')
	const positions = await page
		.locator('[data-slot="thead"], [data-slot="tfoot"]')
		.evaluateAll((ends) => ends.map((end) => getComputedStyle(end).position))
	expect(positions).not.toContain('sticky')
})
