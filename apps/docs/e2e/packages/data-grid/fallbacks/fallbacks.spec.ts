import { expect, test } from '../../../fixtures'

import type { Page } from '@playwright/test'

/**
 * The three states a grid shows instead of rows: loading, empty, and no results.
 *
 * "Empty" and "no results" look alike and mean opposite things — nothing to show versus nothing
 * *left* after a filter — so each test names which one it expects and checks the other is absent.
 * A grid that showed "No data" over a filtered-out table would be telling a person their data is
 * gone.
 *
 * Each fallback row is a row of the table and not a row of the data: it carries `data-slot="tr"`
 * and no `data-row-id`, so `grid.rows()` stays a count of the data throughout.
 */

const EXAMPLE = 'fallbacks'

/** `INITIAL_DATA` in `_data.ts`, under the example's `pageSize: 5`. */
const DATA_ROWS = 5

const LOADING_ROW = '[data-slot="tr"][data-loading-row="true"]'
const EMPTY_CELL = '[data-slot="empty-state-cell"]'
const NO_RESULTS_CELL = '[data-slot="no-results-cell"]'

/** The example's own tabs, not the grid's. */
const mode = (page: Page, label: string) => page.getByRole('button', { name: label, exact: true })

test.describe('fallbacks', () => {
	test.beforeEach(async ({ grid }) => {
		await grid.open(EXAMPLE)
	})

	test('shows skeleton rows while the data is pending, and no data rows', async ({ grid, page }) => {
		// The example opens on this tab.
		await expect(page.locator(LOADING_ROW)).not.toHaveCount(0)
		await expect(grid.rows()).toHaveCount(0)

		// A skeleton is not a row of the data: it has no id and claims none.
		await expect(page.locator(`${LOADING_ROW}[data-row-id]`)).toHaveCount(0)
		// And it is not one of the other two states.
		await expect(page.locator(EMPTY_CELL)).toHaveCount(0)
		await expect(page.locator(NO_RESULTS_CELL)).toHaveCount(0)
	})

	test('the header stays up while the body is pending', async ({ grid }) => {
		// A skeleton that took the header with it would make the grid jump on every fetch.
		await expect(grid.header('name')).toBeVisible()
		await expect(grid.header('email')).toBeVisible()
	})

	test('swaps the skeleton for the data when the load finishes', async ({ grid, page }) => {
		await mode(page, 'Normal').click()

		await expect(page.locator(LOADING_ROW)).toHaveCount(0)
		await expect(grid.rows()).toHaveCount(DATA_ROWS)
	})

	test('says the data is empty when there is none', async ({ grid, page }) => {
		await mode(page, 'Empty data').click()

		const cell = page.locator(EMPTY_CELL)
		await expect(cell).toHaveCount(1)
		await expect(cell).toContainText('No data')
		await expect(grid.rows()).toHaveCount(0)
		// Not the other message: nothing was filtered away.
		await expect(page.locator(NO_RESULTS_CELL)).toHaveCount(0)
	})

	test('the empty row spans the full width of the table', async ({ grid, page }) => {
		await mode(page, 'Empty data').click()

		const table = await grid.header('name').evaluate((th) => th.closest('table')?.getBoundingClientRect().width ?? 0)
		const cellWidth = await page.locator(EMPTY_CELL).evaluate((td) => td.getBoundingClientRect().width)
		expect(Math.abs(cellWidth - table)).toBeLessThan(4)
	})

	// The opposite state: there *is* data, a filter just matched none of it.
	test('says there are no results when a filter matched nothing', async ({ grid, page }) => {
		await mode(page, 'Normal').click()
		await expect(grid.rows()).toHaveCount(DATA_ROWS)

		await mode(page, 'No results').click()
		await grid.header('name').getByRole('textbox').fill('zzzzzz')

		const cell = page.locator(NO_RESULTS_CELL)
		await expect(cell).toHaveCount(1)
		await expect(cell).toContainText('No results')
		await expect(grid.rows()).toHaveCount(0)
		// Not "No data" — the data is still there, behind the filter.
		await expect(page.locator(EMPTY_CELL)).toHaveCount(0)
	})

	test('clearing the filter brings the rows back', async ({ grid, page }) => {
		await mode(page, 'No results').click()
		const filter = grid.header('name').getByRole('textbox')
		await filter.fill('zzzzzz')
		await expect(page.locator(NO_RESULTS_CELL)).toHaveCount(1)

		await filter.fill('')

		await expect(page.locator(NO_RESULTS_CELL)).toHaveCount(0)
		await expect(grid.rows()).toHaveCount(DATA_ROWS)
	})
})
