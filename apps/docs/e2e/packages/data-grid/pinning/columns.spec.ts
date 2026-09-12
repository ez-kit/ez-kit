import { boxOf, expect, test } from '../../../fixtures'

/**
 * Column pinning on the `column-pinning-static` example: `name` is pinned left by the column
 * def, the remaining four columns are 220px each, so the table overflows its container and
 * there is something to scroll.
 *
 * The point of the feature is not the attribute but the behaviour it drives — a pinned column
 * holds its place while the rest of the table slides under it. jsdom renders no layout and
 * computes no sticky offsets, so that half is unprovable there and belongs here.
 */

const EXAMPLE = 'column-pinning-static'
const PINNED = 'name'
const FREE = 'status'

// The five columns add up to 1080px, so the grid only overflows — and pinning only does
// anything — in a viewport narrower than that. The default 1280 would fit the whole table.
test.use({ viewport: { width: 800, height: 700 } })

const SCROLL_BY = 200
/** Sub-pixel drift from layout rounding; a real shift is the full scroll distance. */
const TOLERANCE = 1

test.beforeEach(async ({ grid }) => {
	await grid.open(EXAMPLE)
})

test('a pinned column marks its header and its body cells', async ({ grid, page }) => {
	await expect(grid.header(PINNED)).toHaveAttribute('data-pinned', 'left')
	await expect(grid.header(FREE)).not.toHaveAttribute('data-pinned', /.*/u)

	const pinnedCells = page.locator('[data-slot="tbody"] [data-slot="td"][data-pinned="left"]')
	await expect(pinnedCells).toHaveCount(await grid.rows().count())
})

test('pinned cells are positioned sticky', async ({ grid, page }) => {
	const positions = await page
		.locator('[data-slot="th"][data-pinned], [data-slot="tbody"] [data-slot="td"][data-pinned]')
		.evaluateAll((cells) => cells.map((cell) => getComputedStyle(cell).position))

	expect(positions.length).toBeGreaterThan(0)
	expect([...new Set(positions)]).toEqual(['sticky'])
	// Baseline: the rest of the table is not sticky, so the assertion above is about pinning
	// and not about a stylesheet that sticks every cell.
	const free = await grid.header(FREE).evaluate((cell) => getComputedStyle(cell).position)
	expect(free).not.toBe('sticky')
})

test('a pinned column holds its place while the table scrolls under it', async ({ grid }) => {
	const pinnedBefore = await boxOf(grid.header(PINNED))
	const freeBefore = await boxOf(grid.header(FREE))

	await grid.scrollBy({ x: SCROLL_BY })

	const pinnedAfter = await boxOf(grid.header(PINNED))
	const freeAfter = await boxOf(grid.header(FREE))

	expect(Math.abs(pinnedAfter.x - pinnedBefore.x)).toBeLessThanOrEqual(TOLERANCE)
	// The unpinned column moved by the full scroll distance — proof the container really
	// scrolled, which is what makes the assertion above mean anything.
	expect(freeBefore.x - freeAfter.x).toBeGreaterThan(SCROLL_BY - TOLERANCE)
})
