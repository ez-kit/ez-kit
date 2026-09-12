import { boxOf, expect, test } from '../../../fixtures'

import type { Locator, Page } from '@playwright/test'

/**
 * The page-size selector: the two regions that can hold it, and what picking a size does.
 *
 * `pageSizer` is a `placement`, like `filtering.panel` — it names a container, so each case
 * asserts containment *and* measures the result, because a control parented in the right place
 * but laid out somewhere else is the failure this is worth catching.
 */

/**
 * 1000 users, 10 per page, sizes 10/25/50/100 — the selector in its default region.
 *
 * Its `pagination.items` is what mounts the selector at all: the control appears when there is
 * a list of sizes to offer (or when `pageSizer` asks for it outright), not merely because the
 * grid paginates. The other pagination examples set neither, so they have no selector to place.
 */
const TOOLBAR = 'base-full'
/** 50 users, 10 per page — `pageSizer: 'footer'`, taking the default list of sizes. */
const FOOTER = 'pagination-page-sizer-footer'

const SIZER = '[data-slot="page-sizer"]'
const PAGINATION = '[data-slot="pagination"]'
/** The row the footer placement builds so the sizer and the page controls share one line. */
const FOOTER_ROW = '[data-slot="pagination-row"]'

/**
 * The selector's trigger. Both kits build the control out of their own `Select`, and both
 * stamp its trigger `data-slot="select-trigger"` — the roles differ (shadcn a `combobox`,
 * heroui a `button` with `aria-haspopup="listbox"`), the slot does not.
 */
function sizerTrigger(page: Page): Locator {
	return page.locator(`${SIZER} [data-slot="select-trigger"]`)
}

/** Picks a page size the way a person does: open the selector, choose the option. */
async function chooseSize(page: Page, size: number): Promise<void> {
	await sizerTrigger(page).click()
	await page.getByRole('option', { name: String(size), exact: true }).click()
	await expect(sizerTrigger(page)).toContainText(String(size))
}

test.describe('where the selector goes', () => {
	test('the toolbar, by default', async ({ grid, page }) => {
		await grid.open(TOOLBAR)

		await expect(page.locator(`[data-slot="toolbar"] ${SIZER}`)).toHaveCount(1)
		// The footer keeps its own layout: no shared row is built, so nothing moved down there.
		await expect(page.locator(FOOTER_ROW)).toHaveCount(0)

		const sizer = await boxOf(page.locator(SIZER))
		const table = await boxOf(page.locator('table'))

		expect(sizer.y + sizer.height).toBeLessThanOrEqual(table.y)
	})

	test("`pageSizer: 'footer'` puts it on the page-control row", async ({ grid, page }) => {
		await grid.open(FOOTER)

		await expect(page.locator(`[data-slot="toolbar"] ${SIZER}`)).toHaveCount(0)
		await expect(page.locator(`${FOOTER_ROW} ${SIZER}`)).toHaveCount(1)
		await expect(page.locator(`${FOOTER_ROW} ${PAGINATION}`)).toHaveCount(1)

		const sizer = await boxOf(page.locator(SIZER))
		const pagination = await boxOf(page.locator(PAGINATION))
		const table = await boxOf(page.locator('table'))

		// Below the table, sharing a line with the page controls: sizer to the leading edge,
		// controls to the trailing one. Vertical overlap is the "one row" claim — equal `y` is
		// not owed, the two controls are different heights.
		expect(sizer.y).toBeGreaterThanOrEqual(table.y + table.height)
		expect(sizer.x + sizer.width).toBeLessThanOrEqual(pagination.x)
		expect(sizer.y).toBeLessThan(pagination.y + pagination.height)
		expect(pagination.y).toBeLessThan(sizer.y + sizer.height)
	})
})

test.describe('picking a size', () => {
	test.beforeEach(async ({ grid }) => {
		await grid.open(TOOLBAR)
	})

	test('changes how many rows the page holds', async ({ grid, page }) => {
		await expect(grid.rows()).toHaveCount(10)

		await chooseSize(page, 25)

		await expect(grid.rows()).toHaveCount(25)
		await expect(page.locator('[data-slot="pagination-summary"]')).toHaveText('1–25 of 1000')
	})

	test('returns to the first page', async ({ grid, page }) => {
		const next = page
			.locator(PAGINATION)
			.locator('a, button')
			.filter({ hasText: /^Next$/ })
		await next.click()
		await next.click()
		await expect(page.locator('[data-slot="pagination-summary"]')).toHaveText('21–30 of 1000')

		await chooseSize(page, 25)

		expect((await grid.columnText('name'))[0]).toBe('User 1')
		await expect(page.locator('[data-slot="pagination-summary"]')).toHaveText('1–25 of 1000')
	})
})
