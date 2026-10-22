import { expect, test } from '../../../fixtures'

import type { Locator, Page } from '@playwright/test'

/**
 * A `select` column whose list comes from a `useItems` hook that answers after a delay.
 *
 * The example's hook answers ~1.2 s after the grid mounts — long enough to observe the pending state
 * once the table is on screen, short enough to wait out. Its warehouse `wh_12` is "Berlin" in the row
 * and "Berlin HQ" in the list, so the label on screen says which of the two it came from.
 *
 * The page clock is deliberately left alone: a paused clock also holds the timers the example route
 * needs to load at all, and the table never renders.
 */
const EXAMPLE = 'async-items'

const SKELETON = '[data-slot="select-cell-skeleton"]'

/**
 * The column's multi-select trigger, by its accessible name. The kits name it differently around
 * the shared part — shadcn puts the hint after the label, React Aria's Select puts the value first
 * — so only `Filter Warehouse` is common to both.
 */
function filterTrigger(header: Locator): Locator {
	return header.getByRole('button', { name: /Filter Warehouse/ })
}

/**
 * An option of the open multi-select. shadcn draws checkboxes in a popover, HeroUI a listbox of
 * options — the accessible name is the overlap.
 */
function option(page: Page, name: string): Locator {
	return page.getByRole('checkbox', { name }).or(page.getByRole('option', { name: new RegExp(name) }))
}

test.describe('value lists from a hook', () => {
	test.beforeEach(async ({ grid }) => {
		await grid.open(EXAMPLE)
	})

	test('a cell is pending until the list answers, then shows its label', async ({ grid }) => {
		const cell = await grid.cell(0, 'warehouse')

		await expect(cell.locator(SKELETON)).toBeVisible()

		await expect(cell).toHaveText('Berlin HQ')
		await expect(cell.locator(SKELETON)).toHaveCount(0)
	})

	test('the filter says it is loading, then offers the list', async ({ grid, page }) => {
		const trigger = filterTrigger(grid.header('warehouse'))
		await trigger.click()

		await expect(page.getByText('Loading', { exact: true }).first()).toBeVisible()

		await expect(await grid.cell(0, 'warehouse')).toHaveText('Berlin HQ')
		if (!(await option(page, 'Lyon').isVisible())) await trigger.click()
		await expect(option(page, 'Lyon')).toBeVisible()
		await expect(option(page, 'Berlin HQ')).toBeVisible()
	})
})
