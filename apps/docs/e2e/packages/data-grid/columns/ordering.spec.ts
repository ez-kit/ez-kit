import { expect, test } from '../../../fixtures'

import type { Locator, Page } from '@playwright/test'

/**
 * Moving a column, and the one column that refuses to move.
 *
 * Order is read from the **header row's** `data-column-id` sequence and then confirmed in the
 * body: a move that reordered the headers without reordering the cells would leave every value
 * under the wrong heading, which is the worst failure this feature has and the one a header-only
 * assertion cannot see.
 *
 * `Alt+Arrow` is deliberately **not** exercised here. It works in the shadcn kit only — React
 * Aria's column spreads its own props after the ones the grid hands it, so the key handler is
 * overwritten (see #223 and `/docs/data-grid/kit-parity`) — and a kit-agnostic spec that asserted
 * it would have to special-case a kit, which is the thing this suite exists to avoid. The menu
 * path below is the one both kits offer, and it is what the docs point a keyboard user at.
 */

const EXAMPLE = 'column-ordering'

/** `columns` in `components/column-ordering.tsx`. `name` is `ordering: false`. */
const INITIAL_ORDER = ['name', 'department', 'joinedAt', 'salary']
const LOCKED = 'name'

const MOVE_START = 'Move left'
const MOVE_END = 'Move right'

const columnOrder = (page: Page): Promise<string[]> =>
	page
		.locator('[data-slot="thead"] [data-slot="th"][data-column-id]')
		.evaluateAll((ths) => ths.map((th) => th.getAttribute('data-column-id') ?? ''))

const menuTrigger = (header: Locator) => header.getByRole('button', { name: 'Column options' })
const menuItem = (page: Page, name: string) => page.getByRole('menuitem', { name, exact: true })

/** Opens a column's menu and picks one of its move entries. */
async function move(page: Page, header: Locator, entry: string): Promise<void> {
	await menuTrigger(header).click()
	await menuItem(page, entry).click()
}

test.describe('column ordering', () => {
	test.beforeEach(async ({ grid }) => {
		await grid.open(EXAMPLE)
	})

	test('starts in the order the columns were declared', async ({ page }) => {
		expect(await columnOrder(page)).toEqual(INITIAL_ORDER)
	})

	test('a column menu offers both moves', async ({ grid, page }) => {
		await menuTrigger(grid.header('joinedAt')).click()

		await expect(menuItem(page, MOVE_START)).toHaveCount(1)
		await expect(menuItem(page, MOVE_END)).toHaveCount(1)
	})

	test('moving a column left swaps it with its neighbour', async ({ grid, page }) => {
		await move(page, grid.header('joinedAt'), MOVE_START)

		await expect.poll(() => columnOrder(page)).toEqual(['name', 'joinedAt', 'department', 'salary'])
	})

	test('moving it right swaps it the other way', async ({ grid, page }) => {
		await move(page, grid.header('department'), MOVE_END)

		await expect.poll(() => columnOrder(page)).toEqual(['name', 'joinedAt', 'department', 'salary'])
	})

	// The assertion the header-only version would miss: the values have to travel with the header.
	test('the cells travel with their column', async ({ grid, page }) => {
		const departments = await grid.columnText('department')
		const joined = await grid.columnText('joinedAt')

		await move(page, grid.header('joinedAt'), MOVE_START)
		await expect.poll(() => columnOrder(page)).toEqual(['name', 'joinedAt', 'department', 'salary'])

		// Same values, still under their own headings — read through the header, so this resolves
		// the column at its new position.
		expect(await grid.columnText('joinedAt')).toEqual(joined)
		expect(await grid.columnText('department')).toEqual(departments)
	})

	test('two moves carry a column across the table', async ({ grid, page }) => {
		await move(page, grid.header('salary'), MOVE_START)
		await expect.poll(() => columnOrder(page)).toEqual(['name', 'department', 'salary', 'joinedAt'])

		await move(page, grid.header('salary'), MOVE_START)

		await expect.poll(() => columnOrder(page)).toEqual(['name', 'salary', 'department', 'joinedAt'])
	})

	test('a move is undone by the opposite move', async ({ grid, page }) => {
		await move(page, grid.header('department'), MOVE_END)
		await expect.poll(() => columnOrder(page)).not.toEqual(INITIAL_ORDER)

		await move(page, grid.header('department'), MOVE_START)

		await expect.poll(() => columnOrder(page)).toEqual(INITIAL_ORDER)
	})
})

test.describe('a column with ordering: false', () => {
	test.beforeEach(async ({ grid }) => {
		await grid.open(EXAMPLE)
	})

	test('is offered no move entries of its own', async ({ grid, page }) => {
		await menuTrigger(grid.header(LOCKED)).click()

		await expect(menuItem(page, MOVE_START)).toHaveCount(0)
		await expect(menuItem(page, MOVE_END)).toHaveCount(0)
		// The menu did open — this is not a missing trigger.
		await expect(menuItem(page, 'Asc')).toHaveCount(1)
	})

	// The other half of the rule, and the one that is easy to forget: a locked column is not
	// merely unable to move, its neighbours cannot step over it either.
	//
	// Note the two cases are answered differently, on purpose. A locked column can never move, so
	// its menu omits the entries entirely. A neighbour *can* move — just not in the one direction
	// the lock blocks — so it gets both entries and the blocked one comes back disabled. Omitting
	// it there would make the menu's shape change from row to row for no reason a reader could see.
	test('its neighbour is offered the move, disabled', async ({ grid, page }) => {
		await menuTrigger(grid.header('department')).click()

		// `department` sits immediately after the locked first column, so it has nowhere to go left.
		await expect(menuItem(page, MOVE_START)).toBeDisabled()
		await expect(menuItem(page, MOVE_END)).toBeEnabled()
	})

	test('and it stays first through someone else’s moves', async ({ grid, page }) => {
		await move(page, grid.header('salary'), MOVE_START)

		const order = await columnOrder(page)
		expect(order[0]).toBe(LOCKED)
	})
})
