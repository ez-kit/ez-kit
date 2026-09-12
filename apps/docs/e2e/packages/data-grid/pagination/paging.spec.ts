import { expect, test } from '../../../fixtures'

import type { Locator, Page } from '@playwright/test'

/**
 * Page-based pagination: what the footer controls do to the rows, and what its label says
 * while they do it.
 *
 * The three footer axes — `links`, `edges`, `label` — are display only; paging behaves the same
 * whichever is picked. So each example here is one axis turned on, and every test that presses
 * a control also reads the rows back: a control that renders and moves nothing would otherwise
 * pass on the strength of its own markup.
 */

/** 50 users, 10 per page — prev/next only, default `'range'` label. */
const PREV_NEXT = 'pagination-links-off'
/** 1000 users, 10 per page — 100 pages, far more than the link strip can hold. */
const LINKS = 'pagination-links'
/** 50 users, 10 per page — edge jumps, `label: 'page'`. */
const EDGES = 'pagination-edges'

const PAGE_SIZE = 10
const LAST_PAGE_OF_FIFTY = 5

/** The footer's text. Both kits name it; shadcn took the name from heroui's `Summary`. */
const LABEL = '[data-slot="pagination-summary"]'

/**
 * The page numbers the strip currently offers, in order.
 *
 * Read off the items' text rather than off a slot: `data-slot="pagination-link"` covers the
 * edge jumps as well as the numbers in both kits, and a page link is exactly the control whose
 * whole text is a number.
 */
function pageNumbers(page: Page): Promise<string[]> {
	return page
		.locator('[data-slot="pagination-item"]')
		.evaluateAll((items) => items.map((item) => item.textContent.trim()).filter((text) => /^\d+$/.test(text)))
}

/**
 * A footer control, by role and accessible name.
 *
 * Every control in both kits is a real `<button>` named from the message dictionary — as an
 * `aria-label` on the icon-only ones, as visible text on the page numbers. (shadcn's block used
 * to build them out of the vendored `PaginationLink`, whose `<a>` without an `href` computed to
 * the generic role and took no focus; it renders `Button` directly now.)
 */
function control(page: Page, name: string): Locator {
	return page.locator('[data-slot="pagination"]').getByRole('button', { name, exact: true })
}

/** The names on this page, as `columnText` reads them. */
function names(first: number, count = PAGE_SIZE): string[] {
	return Array.from({ length: count }, (_, i) => `User ${String(first + i)}`)
}

test.describe('prev / next', () => {
	test.beforeEach(async ({ grid }) => {
		await grid.open(PREV_NEXT)
	})

	test('opens on the first page and says which slice that is', async ({ grid, page }) => {
		expect(await grid.columnText('name')).toEqual(names(1))
		await expect(page.locator(LABEL)).toHaveText('1–10 of 50')
	})

	test('Previous is inert on the first page', async ({ grid, page }) => {
		await expect(control(page, 'Previous')).toBeDisabled()
		await expect(control(page, 'Next')).toBeEnabled()

		// Pressed anyway, past the kit's own blocking: a control that renders disabled while
		// keeping its handler would page, and only a press can tell the two apart.
		await control(page, 'Previous').click({ force: true })

		expect(await grid.columnText('name')).toEqual(names(1))
		await expect(page.locator(LABEL)).toHaveText('1–10 of 50')
	})

	test('Next moves on by exactly one page', async ({ grid, page }) => {
		await control(page, 'Next').click()

		expect(await grid.columnText('name')).toEqual(names(11))
		await expect(page.locator(LABEL)).toHaveText('11–20 of 50')
	})

	test('Previous comes back', async ({ grid, page }) => {
		await control(page, 'Next').click()
		await expect(page.locator(LABEL)).toHaveText('11–20 of 50')

		await control(page, 'Previous').click()

		expect(await grid.columnText('name')).toEqual(names(1))
		await expect(page.locator(LABEL)).toHaveText('1–10 of 50')
	})

	test('Next is inert on the last page', async ({ grid, page }) => {
		for (let i = 1; i < LAST_PAGE_OF_FIFTY; i += 1) await control(page, 'Next').click()

		expect(await grid.columnText('name')).toEqual(names(41))
		await expect(page.locator(LABEL)).toHaveText('41–50 of 50')
		await expect(control(page, 'Next')).toBeDisabled()
		await expect(control(page, 'Previous')).toBeEnabled()

		await control(page, 'Next').click({ force: true })

		await expect(page.locator(LABEL)).toHaveText('41–50 of 50')
	})

	/**
	 * The reason both kits build the footer out of real buttons. An `<a>` with no `href` — what
	 * shadcn's vendored `PaginationLink` renders, and what this block used to use — is not
	 * focusable at all: `focus()` is a no-op on it and Enter reaches nothing, so the grid could
	 * only be paged with a mouse.
	 */
	test('the controls take focus and page from the keyboard', async ({ grid, page }) => {
		await control(page, 'Next').focus()
		await expect(control(page, 'Next')).toBeFocused()

		await page.keyboard.press('Enter')

		expect(await grid.columnText('name')).toEqual(names(11))
	})

	test('`links: false` leaves prev/next alone — no numbers, no edge jumps', async ({ page }) => {
		expect(await pageNumbers(page)).toEqual([])
		await expect(page.locator('[data-slot="pagination-ellipsis"]')).toHaveCount(0)
		await expect(control(page, 'Go to first page')).toHaveCount(0)
	})
})

test.describe('page links', () => {
	test.beforeEach(async ({ grid }) => {
		await grid.open(LINKS)
	})

	test('windows the strip instead of listing all hundred pages', async ({ page }) => {
		// `1 … 2 … 100` — the ends plus a window of one either side of the current page, which is
		// the first. The exact strip is the point: "fewer than 100" would also pass on a strip
		// that quietly dropped the last page and left no way to reach the end.
		expect(await pageNumbers(page)).toEqual(['1', '2', '100'])
		await expect(page.locator('[data-slot="pagination-ellipsis"]')).toHaveCount(1)
	})

	test('the current page is the marked one', async ({ page }) => {
		await expect(page.locator('[data-slot="pagination"] [aria-current="page"]')).toHaveText('1')
	})

	test('a page link goes to its page, and the window follows', async ({ grid, page }) => {
		await control(page, '100').click()

		expect(await grid.columnText('name')).toEqual(names(991))
		await expect(page.locator(LABEL)).toHaveText('991–1000 of 1000')
		await expect(page.locator('[data-slot="pagination"] [aria-current="page"]')).toHaveText('100')
		expect(await pageNumbers(page)).toEqual(['1', '99', '100'])
	})
})

test.describe('edge jumps', () => {
	test.beforeEach(async ({ grid }) => {
		await grid.open(EDGES)
	})

	test('`label: page` counts pages rather than rows', async ({ page }) => {
		await expect(page.locator(LABEL)).toHaveText('Page 1 of 5')
	})

	test('jumps to the last page and back to the first', async ({ grid, page }) => {
		await control(page, 'Go to last page').click()

		expect(await grid.columnText('name')).toEqual(names(41))
		await expect(page.locator(LABEL)).toHaveText('Page 5 of 5')
		await expect(control(page, 'Go to last page')).toBeDisabled()

		await control(page, 'Go to first page').click()

		expect(await grid.columnText('name')).toEqual(names(1))
		await expect(page.locator(LABEL)).toHaveText('Page 1 of 5')
		await expect(control(page, 'Go to first page')).toBeDisabled()
	})
})
