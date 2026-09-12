import { expect, test } from '../../../fixtures'

/**
 * `data-scrollport` is the one name for "the element that scrolls the grid".
 *
 * It has to be resolved rather than declared: shadcn scrolls the shared `table-scroll` div,
 * HeroUI its own nested `table-scroll-container`, a virtualized grid a third element again —
 * and the horizontal and vertical scrollports are not always the same element. The react layer
 * already computes both (for pin shadows and infinite-scroll edge detection) and stamps them,
 * so this spec pins down the invariant every kit owes: exactly one element per axis, and it is
 * genuinely the element that scrolls.
 */

const OVERFLOWING = 'column-pinning-static'
const BOUNDED = 'row-pinning-initial'

// Narrow enough that the five 220px columns overflow — otherwise nothing scrolls sideways.
test.use({ viewport: { width: 800, height: 700 } })

for (const [name, example] of [
	['a horizontally overflowing grid', OVERFLOWING],
	['a height-bounded grid', BOUNDED],
] as const) {
	test(`${name} stamps one scrollport per axis`, async ({ grid, page }) => {
		await grid.open(example)

		await expect(page.locator('[data-scrollport~="x"]')).toHaveCount(1)
		await expect(page.locator('[data-scrollport~="y"]')).toHaveCount(1)
	})
}

test('the stamped element is the one that actually scrolls', async ({ grid, page }) => {
	await grid.open(OVERFLOWING)

	const moved = await page.locator('[data-scrollport~="x"]').evaluate((element) => {
		element.scrollBy(120, 0)
		return element.scrollLeft
	})

	// A stamp on a non-scrolling element would leave `scrollLeft` at 0 — which is exactly how
	// an element that merely *reports* overflow (shadcn's `table-container`, `overflow: visible`)
	// would fail this.
	expect(moved).toBeGreaterThan(0)
})
