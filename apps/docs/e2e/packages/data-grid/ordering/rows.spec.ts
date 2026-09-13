import { expect, test } from '../../../fixtures'

import type { Page } from '@playwright/test'

/**
 * Moving a row, in both modes.
 *
 * Order is read from the body's `data-row-id` sequence, which is the react layer's row contract
 * and therefore identical in both kits.
 *
 * `Alt+ArrowUp` / `Alt+ArrowDown` is deliberately **not** exercised here, for the same reason
 * the column spec leaves `Alt+Arrow` alone: it works in the shadcn kit only. React Aria's row
 * forwards no key handler and owns focus inside the grid, so there is nothing in a HeroUI row to
 * attach it to (see `/docs/data-grid/kit-parity`). A kit-agnostic spec asserting it would have
 * to special-case a kit, which is the thing this suite exists to avoid. The menu path below is
 * the one both kits offer.
 */

const UNCONTROLLED = 'row-ordering'
const CONTROLLED = 'row-ordering-controlled'
const PAGINATED = 'row-ordering-paginated'
const TREE = 'row-ordering-tree'

/** `EMPLOYEE_DATA` in `components/_data.ts`, keyed by `getRowId: (row) => String(row.id)`. */
const INITIAL_ORDER = ['1', '2', '3', '4', '5', '6', '7', '8']

const MOVE_UP = 'Move up'
const MOVE_DOWN = 'Move down'

const rowOrder = (page: Page): Promise<string[]> =>
	page
		.locator('[data-slot="tbody"] [data-slot="tr"][data-row-id]')
		.evaluateAll((rows) => rows.map((row) => row.getAttribute('data-row-id') ?? ''))

/** A footer control, by its accessible name — the pagination spec reads them the same way. */
const pageControl = (page: Page, name: string) =>
	page.locator('[data-slot="pagination"]').getByRole('button', { name, exact: true })

const rowById = (page: Page, rowId: string) => page.locator(`[data-slot="tr"][data-row-id="${rowId}"]`)
const menuTrigger = (page: Page, rowId: string) => rowById(page, rowId).getByRole('button', { name: 'Row order' })
const menuItem = (page: Page, name: string) => page.getByRole('menuitem', { name, exact: true })

/** Opens a row's menu and picks one of its move entries. */
async function move(page: Page, rowId: string, entry: string): Promise<void> {
	await menuTrigger(page, rowId).click()
	await menuItem(page, entry).click()
}

test.describe('row ordering — uncontrolled', () => {
	test.beforeEach(async ({ grid }) => {
		await grid.open(UNCONTROLLED)
	})

	test('starts in the order the data was given', async ({ page }) => {
		expect(await rowOrder(page)).toEqual(INITIAL_ORDER)
	})

	test('turns on the actions column by itself', async ({ page }) => {
		// Row ordering has no column of its own: its entries live in the actions cell, so that
		// column has to appear even in a grid with no edit, delete or custom action.
		await expect(menuTrigger(page, '1')).toHaveCount(1)
	})

	test('a row menu offers both moves', async ({ page }) => {
		await menuTrigger(page, '3').click()

		await expect(menuItem(page, MOVE_UP)).toHaveCount(1)
		await expect(menuItem(page, MOVE_DOWN)).toHaveCount(1)
	})

	test('moving a row down swaps it with its neighbour', async ({ page }) => {
		await move(page, '1', MOVE_DOWN)

		await expect.poll(() => rowOrder(page)).toEqual(['2', '1', '3', '4', '5', '6', '7', '8'])
	})

	test('moving a row up swaps it the other way', async ({ page }) => {
		await move(page, '3', MOVE_UP)

		await expect.poll(() => rowOrder(page)).toEqual(['1', '3', '2', '4', '5', '6', '7', '8'])
	})

	test('two steps in the same direction travel two places', async ({ page }) => {
		// The second step is computed from where the row now is, not from where it started.
		await move(page, '1', MOVE_DOWN)
		await move(page, '1', MOVE_DOWN)

		await expect.poll(() => rowOrder(page)).toEqual(['2', '3', '1', '4', '5', '6', '7', '8'])
	})

	test('the ends of the order are disabled, not hidden', async ({ page }) => {
		await menuTrigger(page, '1').click()

		await expect(menuItem(page, MOVE_UP)).toBeDisabled()
		await expect(menuItem(page, MOVE_DOWN)).toBeEnabled()
	})
})

test.describe('row ordering — paginated', () => {
	// The move is defined over the rows on screen, but the order the grid records covers every
	// row it holds. A grid that recorded only the page in front of it would drop the next move
	// made anywhere else, with the menu entry still enabled — the row would simply not move.
	test.beforeEach(async ({ grid }) => {
		await grid.open(PAGINATED)
	})

	test('a page edge is an end of the order', async ({ page }) => {
		await menuTrigger(page, '4').click()

		await expect(menuItem(page, MOVE_DOWN)).toBeDisabled()
		await expect(menuItem(page, MOVE_UP)).toBeEnabled()
	})

	test('a move on the second page lands after one made on the first', async ({ page }) => {
		// Arrange
		await move(page, '1', MOVE_DOWN)
		await expect.poll(() => rowOrder(page)).toEqual(['2', '1', '3', '4'])

		// Act
		await pageControl(page, 'Next').click()
		await expect.poll(() => rowOrder(page)).toEqual(['5', '6', '7', '8'])
		await move(page, '5', MOVE_DOWN)

		// Assert
		await expect.poll(() => rowOrder(page)).toEqual(['6', '5', '7', '8'])
	})

	test('the first page keeps its own arrangement', async ({ page }) => {
		await move(page, '1', MOVE_DOWN)
		await pageControl(page, 'Next').click()
		await move(page, '5', MOVE_DOWN)
		await pageControl(page, 'Previous').click()

		await expect.poll(() => rowOrder(page)).toEqual(['2', '1', '3', '4'])
	})
})

test.describe('row ordering — tree', () => {
	test.beforeEach(async ({ grid }) => {
		await grid.open(TREE)
	})

	test('an expanded parent steps over its own children', async ({ page }) => {
		// What follows an expanded parent in the rendered list is its first child, not its
		// sibling. Treating that child as an end of the order would freeze every expanded row.
		await rowById(page, '1').getByRole('button', { name: 'Expand row' }).click()
		await expect.poll(() => rowOrder(page)).toEqual(['1', '11', '12', '2'])

		await move(page, '1', MOVE_DOWN)

		await expect.poll(() => rowOrder(page)).toEqual(['2', '1', '11', '12'])
	})

	test('a sub-row offers no move while the grid keeps the order', async ({ page }) => {
		// The order is a list of ids over the top-level array, so a child's position — which
		// lives inside its parent — cannot be recorded. Disabled rather than silently inert.
		await rowById(page, '1').getByRole('button', { name: 'Expand row' }).click()

		await menuTrigger(page, '11').click()

		await expect(menuItem(page, MOVE_UP)).toBeDisabled()
		await expect(menuItem(page, MOVE_DOWN)).toBeDisabled()
	})
})

test.describe('row ordering — controlled', () => {
	test('the application reorders its own data', async ({ grid, page }) => {
		// The grid stores nothing here; what repaints is the array the example spliced.
		await grid.open(CONTROLLED)

		await move(page, '1', MOVE_DOWN)

		await expect.poll(() => rowOrder(page)).toEqual(['2', '1', '3', '4', '5', '6', '7', '8'])
	})
})
