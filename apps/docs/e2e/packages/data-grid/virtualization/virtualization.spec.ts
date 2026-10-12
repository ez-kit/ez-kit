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
	 * The row is the wrong element to measure as soon as the window's band stops short of the end of
	 * the list, which is every state but the one this case drives. The row takes the band's bottom pad
	 * as its own `margin-top`, and in heroui's `display: grid` body the pad is counted twice: the
	 * margin offsets the row to the end of the list correctly, and the row's implicit grid track is
	 * then sized to its *margin box* and the row stretched to the whole track — so its border box
	 * keeps its correct top and is pad-plus-content tall, with the pad as empty space **below** the
	 * content. Measured at two different pads in the same session: a 392 px pad gave a 417 px box over
	 * 25 px of content, and a 1 323 px pad gave 1 348 px; in both the row's bottom edge came out
	 * exactly one pad below the end of the scrollable range, i.e. an assertion on the row fails by
	 * exactly the pad on a **healthy** build. The content element is what has to be on screen, and it
	 * is right in every state.
	 */
	const LOADER = `${VIRTUALIZED_BODY} [data-slot="load-more"]`

	/** The example's simulated network latency (`_api.ts`), which the frozen clock never reaches. */
	const FETCH_DELAY_MS = 600

	/**
	 * Scrolls the grid to the end of its range and measures the loader against the scrollport, all
	 * inside one task so that no React render can land between the scroll and the read.
	 *
	 * `null` rather than a verdict where there is nothing to judge: no loader content mounted, or a
	 * range no shorter than the viewport. That second guard is not hypothetical — the first version of
	 * this case read the grid before its first page landed, where the virtualizer's total size is 0 and
	 * the loader sits at the top of an empty body, and it passed in both kits while measuring nothing.
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
	 * clipped away and its control was not hit-testable.
	 *
	 * **It is heroui that this case discriminates in, and shadcn's run is a control rather than a
	 * guard.** Re-measured in exactly the state below, by imposing the old geometry on the live page:
	 * heroui's scrollable range fell from 1 082 px to 1 017 px, putting the loader 52 px past its end
	 * with `elementsFromPoint` no longer returning it, while shadcn's stayed 9 px inside and hittable
	 * on **both** geometries. So a green shadcn run says nothing about the reservation; it is kept
	 * because the claim — the loader is reachable at the end of the range — is one every kit owes, and
	 * a kit that starts clipping its table would be caught here rather than by a reader.
	 *
	 * jsdom returns zeros from `getBoundingClientRect`, so no unit test can hold this, and no other
	 * spec measures the loader at all.
	 *
	 * **Deterministic, with no poll, because the state is frozen rather than raced.** The example's
	 * trigger is `auto` and its loader renders content only while a page is in flight — and the flight
	 * is a 600 ms `setTimeout`, with ten pages of twenty rows behind it. A poll for that window is not
	 * merely slow: each attempt *consumes* one of the nine windows by scrolling to the bottom, and once
	 * the last page lands the loader unmounts for good, so the failure state absorbs and no budget
	 * rescues it. `page.clock.install()` removes the race instead: the grid's own mount-time auto-load
	 * schedules the timer, the clock never reaches it, and the loader stays mounted indefinitely.
	 *
	 * The virtualizer survives the installed clock, which was the thing to check before relying on it
	 * — Playwright's clock stubs `requestAnimationFrame` too. Measured under it: 20 rows mounted, a
	 * 980 px reservation and a 1 082 px range, identical to the un-stubbed figures, and the measurement
	 * below is stable across further `runFor` calls.
	 */
	test('keeps the loader inside the scrollport at the bottom of the range', async ({ grid, page }) => {
		await page.clock.install()
		await grid.open(INFINITE_EXAMPLE)
		// Page 1 lands; the auto-trigger immediately asks for page 2, whose timer the clock never
		// reaches — so from here the grid holds a window, a reservation and a mounted loader, and holds
		// them still.
		await page.clock.runFor(FETCH_DELAY_MS + 100)

		expect(await loaderAtBottomOfScroll(page)).toEqual({ hasBox: true, isInside: true, isHittable: true })
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
