import { expect, test } from '../../../fixtures'

import type { GridFixture } from '../../../fixtures'
import type { Page } from '@playwright/test'

/**
 * `pagination.mode: 'infinite'` — the grid asks for the next page, the consumer appends it.
 *
 * The simulated API behind all four examples serves 200 users, 20 at a time, 600 ms apart, so
 * every assertion here is about *counting rows after a wait*, and the row count is the only
 * honest signal: the grid renders nothing new until the consumer's state grows. Each test
 * therefore waits for the page it expects rather than for a fixed delay.
 *
 * The manual example carries this file's negative control. Automatic detection is the feature,
 * and a test that only ever proves "scrolling loaded more" would pass just as happily on a grid
 * that loaded more on any scroll, `trigger: 'manual'` or not.
 */

const PAGE_SIZE = 20
/** 200 rows behind the cursor — enough that no test here reaches the end. */
const FIRST_PAGE = PAGE_SIZE
const SECOND_PAGE = PAGE_SIZE * 2

/** Loading page 1 takes 600 ms of simulated latency; each page after it takes another. */
const LOAD = { timeout: 10_000 }

const rowCount = (grid: GridFixture) => grid.rows().count()

/** Waits out the initial fetch, which every example starts on mount. */
async function firstPage(grid: GridFixture): Promise<void> {
	await expect.poll(() => rowCount(grid), LOAD).toBe(FIRST_PAGE)
}

/** Drives the scrollport to its bottom edge, where automatic detection lives. */
async function toBottom(grid: GridFixture): Promise<void> {
	await grid.scrollBy({ y: 10_000 })
}

const loadMore = (page: Page) => page.getByRole('button', { name: 'Load more' })

test.describe('automatic loading', () => {
	test.beforeEach(async ({ grid }) => {
		await grid.open('infinite-scroll-auto')
	})

	test('loads the first page on mount', async ({ grid }) => {
		await firstPage(grid)
	})

	test('reaching the bottom loads the next page', async ({ grid }) => {
		await firstPage(grid)

		await toBottom(grid)

		await expect.poll(() => rowCount(grid), LOAD).toBe(SECOND_PAGE)
	})

	test('it keeps going, one page per visit to the bottom', async ({ grid }) => {
		await firstPage(grid)

		await toBottom(grid)
		await expect.poll(() => rowCount(grid), LOAD).toBe(SECOND_PAGE)
		await toBottom(grid)

		await expect.poll(() => rowCount(grid), LOAD).toBe(PAGE_SIZE * 3)
	})

	test('the appended rows continue the sequence rather than repeating it', async ({ grid }) => {
		await firstPage(grid)

		await toBottom(grid)
		await expect.poll(() => rowCount(grid), LOAD).toBe(SECOND_PAGE)

		// A cursor that failed to advance would re-serve page 1 and still double the row count.
		const names = await grid.columnText('name')
		expect(names[0]).toBe('User 1')
		expect(names[PAGE_SIZE]).toBe(`User ${String(PAGE_SIZE + 1)}`)
		expect(new Set(names).size).toBe(SECOND_PAGE)
	})
})

test.describe('manual loading', () => {
	test.beforeEach(async ({ grid }) => {
		await grid.open('infinite-scroll-manual')
	})

	test('offers a load-more row instead of watching the edge', async ({ grid, page }) => {
		await firstPage(grid)

		await expect(page.locator('[data-slot="load-more-row"]')).toHaveCount(1)
		await expect(loadMore(page)).toBeVisible()
	})

	test('scrolling to the bottom loads nothing', async ({ grid }) => {
		await firstPage(grid)

		await toBottom(grid)

		// The control for the auto tests above: with `trigger: 'manual'` the same gesture that
		// loads a page there must load none here. Waiting out two full network delays before
		// reading the count, so this fails rather than races if detection is wrongly armed.
		await expect(async () => {
			expect(await rowCount(grid)).toBe(FIRST_PAGE)
		}).toPass({ timeout: 2_000, intervals: [500, 500, 500, 500] })
	})

	test('the button loads the next page', async ({ grid, page }) => {
		await firstPage(grid)

		await loadMore(page).click()

		await expect.poll(() => rowCount(grid), LOAD).toBe(SECOND_PAGE)
		// And it is still there for the page after that.
		await expect(loadMore(page)).toBeVisible()
	})
})

test.describe('under virtualization', () => {
	test.beforeEach(async ({ grid }) => {
		await grid.open('infinite-scroll-virtualized')
	})

	test('scrolling still loads the next page', async ({ grid }) => {
		await expect.poll(() => rowCount(grid), LOAD).toBeGreaterThan(0)

		await toBottom(grid)

		// The rendered count stays windowed, so the proof that a page arrived is the row the
		// window now reaches — `threshold: { rows: 8 }` fires before the very last row.
		await expect
			.poll(async () => (await grid.columnText('name')).some((name) => name === `User ${String(PAGE_SIZE + 5)}`), LOAD)
			.toBe(true)
	})

	test('renders a window, not every loaded row', async ({ grid }) => {
		await expect.poll(() => rowCount(grid), LOAD).toBeGreaterThan(0)

		await toBottom(grid)
		await expect
			.poll(async () => (await grid.columnText('name')).some((name) => name === `User ${String(PAGE_SIZE + 5)}`), LOAD)
			.toBe(true)

		// Two pages have arrived, and the DOM is holding fewer rows than that. A single page is
		// not enough to show this: `overscan: 10` around a viewport of roughly ten rows renders
		// about twenty, which is exactly one page.
		expect(await rowCount(grid)).toBeLessThan(SECOND_PAGE)
		// The window is a contiguous run, not a subset scattered over the loaded rows: what the
		// virtualizer renders is the rows around the scroll position plus the overscan on each
		// side. After one page load the viewport still sits near the top, so that run reaches
		// back to the first row — which is why "User 1 is gone" is *not* asserted here.
		const rendered = await grid.columnText('name')
		expect(rendered[rendered.length - 1]).not.toBe(`User ${String(SECOND_PAGE)}`)
	})
})

test.describe('resetting on a query change', () => {
	test.beforeEach(async ({ grid }) => {
		await grid.open('infinite-scroll-reset')
	})

	test('a new sort drops the accumulated rows and refetches page one', async ({ grid }) => {
		await firstPage(grid)
		await toBottom(grid)
		await expect.poll(() => rowCount(grid), LOAD).toBe(SECOND_PAGE)

		await grid.sortTrigger('name').click()

		// `sorting.manual` — the rows on screen belong to the previous query, so the example
		// throws them away and asks the server for page 1 of the new one.
		await expect.poll(() => rowCount(grid), LOAD).toBe(FIRST_PAGE)
		expect((await grid.columnText('name'))[0]).toBe('User 1')
	})

	test('the refetched page is in the new order', async ({ grid }) => {
		await firstPage(grid)

		await grid.sortTrigger('name').click()
		await grid.sortTrigger('name').click()

		// Descending, and by string — `User 99` sorts above `User 98` above `User 97`.
		await expect.poll(async () => (await grid.columnText('name'))[0], LOAD).toBe('User 99')
	})

	test('it returns the viewport to the top', async ({ grid, page }) => {
		await firstPage(grid)
		await toBottom(grid)
		await expect.poll(() => rowCount(grid), LOAD).toBe(SECOND_PAGE)
		expect(await page.locator('[data-scrollport~="y"]').evaluate((el) => el.scrollTop)).toBeGreaterThan(0)

		await grid.sortTrigger('name').click()

		await expect.poll(() => page.locator('[data-scrollport~="y"]').evaluate((el) => el.scrollTop), LOAD).toBe(0)
	})
})
