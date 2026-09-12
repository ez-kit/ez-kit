import { boxOf, expect, test } from '../../../fixtures'

import type { Locator, Page } from '@playwright/test'

/**
 * Row virtualization.
 *
 * The whole point of the feature is a discrepancy — the grid claims 10 000 rows and holds a few
 * dozen — so every test here is about the gap between the two: what is in the DOM, what the
 * scroll range says is there, and what a person sees after scrolling. Counting rendered rows
 * alone would pass just as well on a grid that lost 9 977 rows.
 *
 * jsdom cannot answer any of this: `getBoundingClientRect` returns zeros there, so the
 * virtualizer measures a viewport of height 0 and renders whatever its fallback decides. These
 * assertions only mean something in a real browser.
 */

const EXAMPLE = 'virtualized'

/** `VIRTUAL_ROW_COUNT`, `estimateSize` and `overscan` in `components/virtualized.tsx`. */
const TOTAL_ROWS = 10_000
const ROW_HEIGHT = 49
const OVERSCAN = 10

const SCROLL_BY = 4000

const VIRTUALIZED_BODY = '[data-slot="tbody"][data-virtualized="true"]'

/** Rows are positioned by the virtualizer; the attribute is how a kit's CSS finds them. */
const VIRTUAL_ROW = '[data-slot="tr"][data-virtual="row"]'

const rowIds = (page: Page) =>
	page.locator(VIRTUAL_ROW).evaluateAll((rows) => rows.map((row) => row.getAttribute('data-row-id') ?? ''))

/** The scroll element the react layer resolved for this kit, in virtualized mode. */
const scrollport = (page: Page): Locator => page.locator('[data-scrollport~="y"]')

test.describe('a virtualized grid', () => {
	test.beforeEach(async ({ grid }) => {
		await grid.open(EXAMPLE)
	})

	test('holds a window of rows, not the data', async ({ grid }) => {
		const rendered = await grid.rows().count()

		expect(rendered).toBeGreaterThan(0)
		expect(rendered, 'the grid rendered every row — virtualization is off').toBeLessThan(TOTAL_ROWS / 10)
	})

	test('every rendered row is marked as positioned by the virtualizer', async ({ grid, page }) => {
		await expect(page.locator(VIRTUAL_ROW)).toHaveCount(await grid.rows().count())
	})

	// The window is small; the *scroll range* is what tells a person — and their scrollbar — that
	// there are ten thousand rows behind it.
	test('reserves the height of the whole list', async ({ page }) => {
		const reserved = await page.locator(VIRTUALIZED_BODY).evaluate((body) => body.getBoundingClientRect().height)

		expect(reserved).toBeCloseTo(TOTAL_ROWS * ROW_HEIGHT, -2)
	})

	// Nothing measures the rows back after mount, so each row is given the exact height the
	// virtualizer reserved for it. Without that, a kit whose natural row height differs from
	// `estimateSize` leaves a gap — or an overlap — between every pair of rows.
	test('lays its rows edge to edge, with no gap or overlap', async ({ grid }) => {
		const first = await boxOf(grid.rows().nth(0))
		const second = await boxOf(grid.rows().nth(1))
		const third = await boxOf(grid.rows().nth(2))

		expect(second.y - first.y).toBeCloseTo(ROW_HEIGHT, 0)
		expect(third.y - second.y).toBeCloseTo(ROW_HEIGHT, 0)
	})

	test('swaps the window for different rows as it scrolls', async ({ grid, page }) => {
		const before = await rowIds(page)
		expect(before[0]).toBe('1')

		await grid.scrollBy({ y: SCROLL_BY })

		const after = await rowIds(page)
		expect(after, 'the rendered rows did not change').not.toEqual(before)

		// Not merely different — the window landed where the scroll put it. `overscan` rows are
		// kept above the first visible one, and the ids in this data are 1-based, so the window
		// begins that far back. A band rather than an exact index: the two kits round the
		// scrollport's height differently, and the point is *where*, not to the row.
		const firstVisible = Math.floor(SCROLL_BY / ROW_HEIGHT)
		expect(Number(after[0])).toBeGreaterThan(firstVisible - OVERSCAN - 5)
		expect(Number(after[0])).toBeLessThanOrEqual(firstVisible + 1)

		// And still a window, not an accumulation.
		expect(after.length).toBeLessThan(TOTAL_ROWS / 10)
	})

	test('reaches the last row of the data at the bottom of the range', async ({ grid, page }) => {
		await grid.scrollBy({ y: TOTAL_ROWS * ROW_HEIGHT })

		expect(await grid.columnText('name')).toContain(`User ${String(TOTAL_ROWS)}`)
		await expect(scrollport(page)).toHaveCount(1)
	})

	test('scrolls back to where it started', async ({ grid, page }) => {
		await grid.scrollBy({ y: 4000 })
		expect((await rowIds(page))[0]).not.toBe('1')

		await grid.scrollBy({ y: -4000 })

		expect((await rowIds(page))[0]).toBe('1')
	})

	// The example turns the sticky header on precisely because a virtualized grid scrolls inside
	// itself: the header has to stay put while ten thousand rows move past it.
	test('keeps the header in place while the rows move under it', async ({ grid }) => {
		const headerBefore = await boxOf(grid.header('name'))
		const firstRowBefore = await boxOf(grid.rows().first())

		await grid.scrollBy({ y: 1000 })

		const headerAfter = await boxOf(grid.header('name'))
		expect(headerAfter.y, 'the header scrolled away with the rows').toBeCloseTo(headerBefore.y, 0)
		// The control: the body really did move.
		const firstRowAfter = await boxOf(grid.rows().first())
		expect(Math.abs(firstRowAfter.y - firstRowBefore.y)).toBeGreaterThan(0)
	})
})

test.describe('a virtualized grid being sorted', () => {
	test.beforeEach(async ({ grid }) => {
		await grid.open(EXAMPLE)
	})

	// Sorting reorders ten thousand rows while a few dozen are mounted — the window has to be
	// rebuilt from the new order rather than re-labelled in place.
	//
	// Descending, deliberately: TanStack's default comparator is natural rather than
	// lexicographic, so `User 1, User 2, User 3…` ascending is the order the data already had,
	// and a grid that ignored the sort entirely would pass. Descending has to reach the far end
	// of ten thousand rows to answer.
	test('rebuilds the window from the new order, from the top', async ({ grid }) => {
		expect((await grid.columnText('name'))[0]).toBe('User 1')

		await grid.sortTrigger('name').click()
		await expect.poll(() => grid.sortDirection('name')).toBe('asc')
		await grid.sortTrigger('name').click()
		await expect.poll(() => grid.sortDirection('name')).toBe('desc')

		expect((await grid.columnText('name'))[0]).toBe(`User ${String(TOTAL_ROWS)}`)
	})

	test('and still holds only a window of them', async ({ grid }) => {
		await grid.sortTrigger('name').click()
		await expect.poll(() => grid.sortDirection('name')).toBe('asc')

		expect(await grid.rows().count()).toBeLessThan(TOTAL_ROWS / 10)
	})
})
