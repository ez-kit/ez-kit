import { expect, test } from '../../../fixtures'

import type { Locator, Page } from '@playwright/test'

/**
 * The Columns toggle once `ordering.column.visibilityMenu` turns it into a column panel.
 *
 * Order is read from the **header row's** `data-column-id` sequence, as in `ordering.spec.ts`:
 * the panel writes `columnOrder`, and the table is where that has to show up.
 *
 * The panel's own rows are addressed through `data-slot`, not by role: the two kits draw the list
 * differently on purpose — shadcn a popover of checkboxes, HeroUI a popover dialog rather than
 * its selection menu, because a react-aria menu item owns the press that lands on it and would
 * swallow the buttons. What both kits do author is the slot, so that is what the spec addresses.
 */

const EXAMPLE = 'column-panel-ordering'

/** `panelColumns` in `components/column-ordering.tsx`. */
const INITIAL_ORDER = ['name', 'department', 'joinedAt', 'salary']
/** `visibility: false` — listed, but its checkbox is not offered. */
const LOCKED_VISIBILITY = 'Name'
/** `ordering: false` — listed and hideable, but fixed where it was declared. */
const LOCKED_ORDERING = 'Salary'

const columnsTrigger = (page: Page) => page.getByRole('button', { name: 'Columns' })

const panelRows = (page: Page) => page.locator('[data-slot="column-visibility-item"]')

/** One panel row, found by the column label it carries. */
const panelRow = (page: Page, label: string): Locator => panelRows(page).filter({ hasText: label })

const moveUp = (row: Locator) => row.locator('[data-slot="column-visibility-move-start"]')
const moveDown = (row: Locator) => row.locator('[data-slot="column-visibility-move-end"]')

const columnOrder = (page: Page): Promise<string[]> =>
	page
		.locator('[data-slot="thead"] [data-slot="th"][data-column-id]')
		.evaluateAll((ths) => ths.map((th) => th.getAttribute('data-column-id') ?? ''))

/** Opens the panel, if it is not already open. */
async function openPanel(page: Page): Promise<void> {
	if ((await panelRows(page).count()) > 0) return
	await columnsTrigger(page).click()
	await expect(panelRows(page).first()).toBeVisible()
}

test.describe('the column panel', () => {
	test.beforeEach(async ({ grid, page }) => {
		await grid.open(EXAMPLE)
		await openPanel(page)
	})

	test('lists every non-system column, locked ones included', async ({ page }) => {
		await expect(panelRows(page)).toHaveCount(INITIAL_ORDER.length)
	})

	test('moves a column one step down the list', async ({ page }) => {
		await moveDown(panelRow(page, 'Department')).click()

		await expect.poll(() => columnOrder(page)).toEqual(['name', 'joinedAt', 'department', 'salary'])
	})

	test('and one step back up again', async ({ page }) => {
		await moveDown(panelRow(page, 'Department')).click()
		await expect.poll(() => columnOrder(page)).not.toEqual(INITIAL_ORDER)

		await moveUp(panelRow(page, 'Department')).click()

		await expect.poll(() => columnOrder(page)).toEqual(INITIAL_ORDER)
	})

	test('disables the step that would leave the list', async ({ page }) => {
		await expect(moveUp(panelRow(page, 'Name'))).toBeDisabled()
		await expect(moveDown(panelRow(page, 'Department'))).toBeEnabled()
	})

	test('offers no toggle for a column that can never be hidden', async ({ page }) => {
		const row = panelRow(page, LOCKED_VISIBILITY)

		await expect(row.getByRole('checkbox')).toBeDisabled()
		// Listed all the same, because it still holds a place in the order.
		await expect(row).toHaveCount(1)
	})

	test('offers no move for a column the author fixed', async ({ page }) => {
		const row = panelRow(page, LOCKED_ORDERING)

		await expect(moveUp(row)).toBeDisabled()
		await expect(moveDown(row)).toBeDisabled()
	})

	// The other half of that rule: a locked column is not a landing spot either.
	test('and none for its neighbour in that direction', async ({ page }) => {
		await expect(moveDown(panelRow(page, 'Joined'))).toBeDisabled()
	})

	test('lands on a hidden row rather than jumping over it', async ({ page }) => {
		// Hide `department`, which stays listed — the panel is the order, hidden rows and all.
		await panelRow(page, 'Department').getByRole('checkbox').click()
		await expect.poll(() => columnOrder(page)).toEqual(['name', 'joinedAt', 'salary'])

		await moveUp(panelRow(page, 'Joined')).click()

		// One step: `joinedAt` passed `department`, not `department` and `name` both.
		await expect.poll(() => columnOrder(page)).toEqual(['name', 'joinedAt', 'salary'])
		await panelRow(page, 'Department').getByRole('checkbox').click()

		await expect.poll(() => columnOrder(page)).toEqual(['name', 'joinedAt', 'department', 'salary'])
	})
})
