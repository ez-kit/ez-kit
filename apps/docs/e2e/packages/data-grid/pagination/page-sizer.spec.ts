import { boxOf, expect, test } from '../../../fixtures'

import type { Locator, Page } from '@playwright/test'

/**
 * The page-size selector: the two regions that usually hold it, and what picking a size does.
 *
 * There is no longer any option that places it — `pagination.pageSizer` is gone, and a layout
 * says where the control goes by writing `<DataGrid.PageSizer />` there. So each case asserts
 * containment *and* measures the result, because a control parented in the right place but laid
 * out somewhere else is the failure this is worth catching.
 *
 * Note that neither region is a default: `DefaultLayout`, what both UI kits bind to
 * `core.Layout`, mounts no selector at all. Both examples below place one deliberately.
 */

/** 1000 users, 10 per page, sizes 10/25/50/100 — `<DataGrid.PageSizer />` in `Toolbar.start`. */
const TOOLBAR = 'pagination-page-sizer-toolbar'
/** 50 users, 10 per page — the `BottomBarLayout` preset, taking the default list of sizes. */
const FOOTER = 'pagination-page-sizer-footer'

const SIZER = '[data-slot="page-sizer"]'
const PAGINATION = '[data-slot="pagination"]'
/** The row the footer placement builds so the sizer and the page controls share one line. */
const BOTTOM_BAR = '[data-slot="bottom-bar"]'

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
	test('the toolbar, when the layout writes it there', async ({ grid, page }) => {
		await grid.open(TOOLBAR)

		await expect(page.locator(`[data-slot="toolbar"] ${SIZER}`)).toHaveCount(1)
		// This layout mounts `<DataGrid.Pagination />` rather than the bottom bar, so no shared
		// row is built and nothing moved down there.
		await expect(page.locator(BOTTOM_BAR)).toHaveCount(0)

		const sizer = await boxOf(page.locator(SIZER))
		const table = await boxOf(page.locator('table'))

		expect(sizer.y + sizer.height).toBeLessThanOrEqual(table.y)
	})

	test('`BottomBarLayout` puts it on the page-control row', async ({ grid, page }) => {
		await grid.open(FOOTER)

		// No positive control is possible for this line: the `pagination-page-sizer-footer`
		// example mounts **no toolbar at all** (measured — `[data-slot="toolbar"]` resolves to 0
		// elements here, because the preset's toolbar has neither slot filled and renders
		// nothing), so the compound selector is empty whatever the sizer does. An earlier pass
		// added `toHaveCount(1)` on the toolbar as a control; that premise is false for this
		// example, and the "hardening" only turned a vacuous pass into a red test.
		//
		// The two positives below are what make the placement claim mean anything — the sizer and
		// the pagination row are each asserted present, and the `boxOf` reads that follow throw on
		// an element that renders no box.
		await expect(page.locator(`[data-slot="toolbar"] ${SIZER}`)).toHaveCount(0)
		await expect(page.locator(`${BOTTOM_BAR} ${SIZER}`)).toHaveCount(1)
		await expect(page.locator(`${BOTTOM_BAR} ${PAGINATION}`)).toHaveCount(1)

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
