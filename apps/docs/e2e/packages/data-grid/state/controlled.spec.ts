import { expect, test } from '../../../fixtures'

/**
 * A grid whose `sorting` and `pagination` live in the page's own `useState`.
 *
 * The example renders its state *outside* the grid — "Active sort: name ↑" and a Reset button
 * that writes to the same `useState` — which is what makes this testable end to end: if the
 * readout follows the header click, `onStateChange` really handed the change to the parent, and
 * if the grid follows the Reset button, it really renders from what the parent handed back. A
 * grid quietly keeping its own copy would pass one of those two and fail the other.
 */

const EXAMPLE = 'controlled-state'

/** `pagination.pageSize: 3` over the five users of `INITIAL_DATA`. */
const PAGE_ONE = ['Alice Johnson', 'Bob Smith', 'Carol White']
const PAGE_TWO = ['Dave Brown', 'Eve Davis']
/** The same three rows a descending sort puts on page one. */
const PAGE_ONE_DESC = ['Eve Davis', 'Dave Brown', 'Carol White']

const readout = (text: string) => new RegExp(`Active sort:\\s*${text}`)

test.describe('a controlled grid', () => {
	test.beforeEach(async ({ grid }) => {
		await grid.open(EXAMPLE)
	})

	test('renders the sort the parent seeded it with', async ({ grid, page }) => {
		expect(await grid.columnText('name')).toEqual(PAGE_ONE)
		expect(await grid.sortDirection('name')).toBe('asc')
		await expect(page.getByText(readout('name ↑'))).toBeVisible()
	})

	test('a header click reaches the parent’s state', async ({ grid, page }) => {
		await grid.sortTrigger('name').click()

		// The readout is rendered by the page, not by the grid — it can only have changed
		// because `onStateChange` fired and the parent stored the new sort.
		await expect(page.getByText(readout('name ↓'))).toBeVisible()
		expect(await grid.columnText('name')).toEqual(PAGE_ONE_DESC)
		expect(await grid.sortDirection('name')).toBe('desc')
	})

	test('a control outside the grid drives it', async ({ grid, page }) => {
		await grid.sortTrigger('name').click()
		expect(await grid.sortDirection('name')).toBe('desc')

		await page.getByRole('button', { name: 'Reset sort' }).click()

		// Nothing inside the grid was touched: the parent wrote `sorting: []` and the grid
		// re-rendered from it.
		await expect(page.getByText(readout('none'))).toBeVisible()
		await expect.poll(() => grid.sortDirection('name')).not.toBe('desc')
		expect(await grid.columnText('name')).toEqual(PAGE_ONE)
	})

	test('paging is controlled too', async ({ grid, page }) => {
		// Scoped to the footer: the dev server's own overlay ships a button named "Next.js…".
		await page.locator('[data-slot="pagination"]').getByRole('button', { name: 'Next', exact: true }).click()

		await expect.poll(() => grid.columnText('name')).toEqual(PAGE_TWO)
	})
})
