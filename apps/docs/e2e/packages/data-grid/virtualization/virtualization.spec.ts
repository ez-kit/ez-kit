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

/**
 * The virtualized grid that also loads pages as it scrolls — the only example where anything
 * follows the window's band inside the `tbody`.
 */
const INFINITE_EXAMPLE = 'infinite-scroll-virtualized'

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

/**
 * The loader row, which is the one thing that renders **after** the window's band inside the
 * virtualized `tbody` — and therefore the one thing the band's own scroll reservation can push out of
 * reach.
 *
 * Kept in this file rather than in an infinite-scroll spec of its own (there is none) because the
 * claim is about the reservation that `reserves the height of the whole list` above measures, read
 * from the other side: that test says the tbody is as tall as the list, this one says the tbody is
 * not *only* that tall.
 */
test.describe('a virtualized grid that loads more rows', () => {
	/**
	 * The loader's **content** — the spinner or message a kit renders — rather than the
	 * `load-more-row` that carries it.
	 *
	 * The row is the wrong element to measure. It takes the band's bottom pad as its own `margin-top`,
	 * and in heroui's `display: grid` body that margin lands inside the row's grid area: the row
	 * reports a border box that starts where the margin starts and is the margin plus the content tall
	 * (measured: 417 px for 392 px of pad and 25 px of content), so its box bottom is hundreds of
	 * pixels from where anything is drawn. The content element is what has to be on screen.
	 */
	const LOADER = `${VIRTUALIZED_BODY} [data-slot="load-more"]`

	/** How long the poll below has to catch the loader mounted — see the test's own note. */
	const LOADER_POLL_MS = 15_000

	/**
	 * Scrolls the grid to the end of its range and measures the loader against the scrollport, all
	 * inside one task so that no React render can land between the scroll and the read.
	 *
	 * `null` rather than a verdict in the two states where there is nothing to judge: a range no longer
	 * than the viewport (the grid before its first page lands — its loader sits at the top and is
	 * trivially inside, which is a vacuous pass, measured), and no loader content mounted.
	 */
	const loaderAtBottomOfScroll = (page: Page) =>
		page.evaluate((selector) => {
			const port = document.querySelector('[data-scrollport~="y"]')
			if (!(port instanceof HTMLElement)) return null
			port.scrollTop = port.scrollHeight
			if (port.scrollHeight <= port.clientHeight) return null
			const loader = document.querySelector(selector)
			if (!(loader instanceof HTMLElement)) return null
			const portBox = port.getBoundingClientRect()
			const loaderBox = loader.getBoundingClientRect()
			return {
				/** A clipped loader can report a zero-height box instead of a box out of bounds. */
				hasBox: loaderBox.height > 0,
				/** Its bottom edge is above the scrollport's, i.e. the range reaches it. */
				isInside: portBox.bottom - loaderBox.bottom >= 0,
				/** And it is the element at its own centre — the symptom was a control nothing could click. */
				isHittable: document
					.elementsFromPoint(loaderBox.left + loaderBox.width / 2, loaderBox.top + loaderBox.height / 2)
					.includes(loader),
			}
		}, LOADER)

	/*
	 * The regression this exists for, which nothing else on any level can see.
	 *
	 * The tbody reserves the virtual scroll range with `min-height`, not `height`. Fixed, the loader —
	 * which is in flow after the band — could only *overflow* the tbody. The shadcn kit tolerates that,
	 * because the overflow reaches the scrollport's scrollable range anyway; the heroui kit does not,
	 * because its own `<table>` is `overflow: clip`, so at the bottom of the scroll the loader was
	 * clipped away and its control was not hit-testable. Re-measured here by imposing the old geometry
	 * on the live page: heroui's loader went to 52 px below the scrollport's bottom edge with
	 * `elementsFromPoint` no longer returning it, while shadcn's stayed 9 px inside and hittable. So
	 * **this case fails in heroui and passes in shadcn on the old geometry** — one kit is all it takes,
	 * and asserting it per kit would state which kit clips rather than that the loader is reachable.
	 *
	 * jsdom returns zeros from `getBoundingClientRect`, so no unit test can hold this, and no other
	 * spec measures the loader at all.
	 *
	 * **Polled, and the poll needs its own budget.** The example's trigger is `auto` and its loader
	 * renders content only while a page is in flight, so the measurable state is the ~600 ms of each
	 * fetch — which each attempt starts by scrolling to the bottom. The grid holds ten pages, so there
	 * are about nine of those windows to catch; measured, an attempt lands inside one roughly five
	 * times in six, and the default 5 s expect timeout leaves too little room for that to be
	 * comfortable.
	 */
	test('keeps the loader inside the scrollport at the bottom of the range', async ({ grid, page }) => {
		await grid.open(INFINITE_EXAMPLE)

		await expect
			.poll(() => loaderAtBottomOfScroll(page), {
				message: 'the loader never came into reach at the end of the range',
				timeout: LOADER_POLL_MS,
			})
			.toEqual({ hasBox: true, isInside: true, isHittable: true })
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
