import { describe, expect, it } from 'vitest'

import { buildPageWindow, PAGE_GAP } from './page-window'

/** The issue's scenario: 100 pages used to render 100 live page links in one flex row. */
const LARGE_PAGE_COUNT = 100

describe('buildPageWindow — no window needed', () => {
	it('lists every page when they all fit within the boundaries and the window', () => {
		// Arrange / Act
		const window = buildPageWindow({ pageIndex: 0, pageCount: 5, siblings: 1, boundaries: 1 })

		// Assert
		expect(window).toEqual([0, 1, 2, 3, 4])
	})

	it('lists the single page of a one-page grid', () => {
		expect(buildPageWindow({ pageIndex: 0, pageCount: 1 })).toEqual([0])
	})

	// The widest a windowed strip gets with the defaults is 7 slots (1 … 4 5 6 … 100), so a
	// 7-page grid gains nothing from gaps — they would hide pages to save no room at all.
	it('lists every page of a grid exactly as wide as the windowed strip', () => {
		expect(buildPageWindow({ pageIndex: 3, pageCount: 7 })).toEqual([0, 1, 2, 3, 4, 5, 6])
	})

	it('starts windowing at the first page count that cannot fit', () => {
		expect(buildPageWindow({ pageIndex: 3, pageCount: 8 })).toEqual([0, 1, 2, 3, 4, PAGE_GAP, 7])
	})

	it('returns nothing for an empty grid', () => {
		expect(buildPageWindow({ pageIndex: 0, pageCount: 0 })).toEqual([])
	})
})

describe('buildPageWindow — large page counts', () => {
	it('shows boundaries, the window around the current page and gaps in the middle', () => {
		const window = buildPageWindow({ pageIndex: 4, pageCount: LARGE_PAGE_COUNT, siblings: 1, boundaries: 1 })

		// `1 … 4 5 6 … 100`
		expect(window).toEqual([0, PAGE_GAP, 3, 4, 5, PAGE_GAP, 99])
	})

	it('drops the leading gap when the current page sits at the start', () => {
		const window = buildPageWindow({ pageIndex: 0, pageCount: LARGE_PAGE_COUNT, siblings: 1, boundaries: 1 })

		// `1 2 … 100` — no gap before page 1, which is its own boundary.
		expect(window).toEqual([0, 1, PAGE_GAP, 99])
	})

	it('drops the trailing gap when the current page sits at the end', () => {
		const window = buildPageWindow({ pageIndex: 99, pageCount: LARGE_PAGE_COUNT, siblings: 1, boundaries: 1 })

		expect(window).toEqual([0, PAGE_GAP, 98, 99])
	})

	// The whole point of the issue: the strip stays a handful of controls, not `pageCount` of them.
	it('renders a bounded number of controls regardless of the total', () => {
		const window = buildPageWindow({ pageIndex: 50, pageCount: 10_000, siblings: 1, boundaries: 1 })

		expect(window).toEqual([0, PAGE_GAP, 49, 50, 51, PAGE_GAP, 9999])
		expect(window.length).toBeLessThan(10)
	})
})

describe('buildPageWindow — gap collapsing', () => {
	// A gap standing in for one page is pure loss: `…` takes the room `2` would have, and
	// costs the user a click. Page 3 of 10 hides only page 2 on the left.
	it('shows the single hidden page instead of a gap that would replace it', () => {
		const window = buildPageWindow({ pageIndex: 3, pageCount: 10, siblings: 1, boundaries: 1 })

		expect(window).toEqual([0, 1, 2, 3, 4, PAGE_GAP, 9])
	})

	it('uses a gap as soon as it hides more than one page', () => {
		const window = buildPageWindow({ pageIndex: 4, pageCount: 10, siblings: 1, boundaries: 1 })

		expect(window).toEqual([0, PAGE_GAP, 3, 4, 5, PAGE_GAP, 9])
	})
})

describe('buildPageWindow — configuration', () => {
	it('defaults to one sibling and one boundary', () => {
		const explicit = buildPageWindow({ pageIndex: 4, pageCount: LARGE_PAGE_COUNT, siblings: 1, boundaries: 1 })

		expect(buildPageWindow({ pageIndex: 4, pageCount: LARGE_PAGE_COUNT })).toEqual(explicit)
	})

	it('widens the window around the current page with more siblings', () => {
		const window = buildPageWindow({ pageIndex: 50, pageCount: LARGE_PAGE_COUNT, siblings: 2, boundaries: 1 })

		expect(window).toEqual([0, PAGE_GAP, 48, 49, 50, 51, 52, PAGE_GAP, 99])
	})

	it('keeps more pages at each end with more boundaries', () => {
		const window = buildPageWindow({ pageIndex: 50, pageCount: LARGE_PAGE_COUNT, siblings: 1, boundaries: 2 })

		expect(window).toEqual([0, 1, PAGE_GAP, 49, 50, 51, PAGE_GAP, 98, 99])
	})

	it('keeps only the current page when both are zero', () => {
		const window = buildPageWindow({ pageIndex: 50, pageCount: LARGE_PAGE_COUNT, siblings: 0, boundaries: 0 })

		expect(window).toEqual([50])
	})

	it('drops the ends but keeps the window when boundaries are zero', () => {
		const window = buildPageWindow({ pageIndex: 50, pageCount: LARGE_PAGE_COUNT, siblings: 1, boundaries: 0 })

		expect(window).toEqual([49, 50, 51])
	})

	it('keeps the ends and the bare current page when siblings are zero', () => {
		const window = buildPageWindow({ pageIndex: 50, pageCount: LARGE_PAGE_COUNT, siblings: 0, boundaries: 1 })

		expect(window).toEqual([0, PAGE_GAP, 50, PAGE_GAP, 99])
	})

	// Negative values would invert the window bounds and silently produce an empty strip.
	it('treats negative siblings and boundaries as zero', () => {
		const window = buildPageWindow({ pageIndex: 50, pageCount: LARGE_PAGE_COUNT, siblings: -1, boundaries: -1 })

		expect(window).toEqual([50])
	})
})

describe('buildPageWindow — out-of-range current page', () => {
	// A server-paginated grid does not rewind when `rowCount` shrinks under it
	// (`autoResetPageIndex` defaults to `!manualPagination`), so `pageIndex` can sit past the end.
	it('clamps a page past the end to the last page', () => {
		const window = buildPageWindow({ pageIndex: 500, pageCount: 10, siblings: 1, boundaries: 1 })

		expect(window).toEqual([0, PAGE_GAP, 8, 9])
	})

	it('clamps a negative page to the first page', () => {
		const window = buildPageWindow({ pageIndex: -5, pageCount: 10, siblings: 1, boundaries: 1 })

		expect(window).toEqual([0, 1, PAGE_GAP, 9])
	})
})
