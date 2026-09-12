import { expect, test, toggle } from '../../../fixtures'

import type { Locator, Page } from '@playwright/test'

/**
 * Row selection and the bar it raises.
 *
 * Checkboxes are addressed by ARIA role rather than by markup: the kits disagree completely
 * about what a checkbox *is* — shadcn renders `button[role="checkbox"]`, HeroUI a real
 * `<input type="checkbox">` behind a styled span — and the role is the one thing both owe a
 * screen reader and this spec.
 */

const PLAIN = 'base-selection'
/** 12 rows, 6 per page, with a bulk-delete bar wired up. */
const WITH_BAR = 'selection-delete'

const PAGE_SIZE = 6
const TOTAL_ROWS = 12

/**
 * One name in both kits, and `data-state` for whether it is up: shadcn keeps the bar mounted
 * and fades it out, HeroUI unmounts it, so presence is not the question — `open` is.
 */
const BAR = '[data-slot="selection-bar"]'
const BAR_OPEN = '[data-slot="selection-bar"][data-state="open"]'

function rowCheckboxes(page: Page): Locator {
	return page.locator('[data-slot="tbody"]').getByRole('checkbox')
}

function selectAllCheckbox(page: Page): Locator {
	return page.locator('[data-slot-selection-th]').getByRole('checkbox')
}

test.describe('a grid with selection on', () => {
	test.beforeEach(async ({ grid }) => {
		await grid.open(PLAIN)
	})

	test('offers a checkbox per row and one to select them all', async ({ grid, page }) => {
		await expect(rowCheckboxes(page)).toHaveCount(await grid.rows().count())
		await expect(selectAllCheckbox(page)).toHaveCount(1)
		await expect(selectAllCheckbox(page)).not.toBeChecked()
	})

	test('selecting a row checks that row alone', async ({ page }) => {
		await toggle(rowCheckboxes(page).first())

		await expect(rowCheckboxes(page).first()).toBeChecked()
		await expect(rowCheckboxes(page).nth(1)).not.toBeChecked()
	})

	// `data-row-selected`, not `data-selected`: React Aria reserves the latter on its rows and
	// overwrites whatever a kit passes, so heroui could never carry it. See `row.tsx`.
	test('the row carries the selected state', async ({ grid, page }) => {
		await toggle(rowCheckboxes(page).first())

		await expect(grid.rows().first()).toHaveAttribute('data-row-selected', 'true')
		await expect(page.locator('[data-slot="tr"][data-row-selected="true"]')).toHaveCount(1)
	})

	test('the selected row is painted differently from its neighbours', async ({ grid, page }) => {
		const background = (index: number) =>
			grid
				.rows()
				.nth(index)
				.evaluate((row) => getComputedStyle(row).backgroundColor)

		// Away from every row: hover paints a row too, and would answer for selection here.
		await page.mouse.move(0, 0)
		const plain = await background(0)

		await toggle(rowCheckboxes(page).first())
		await page.mouse.move(0, 0)

		expect(await background(0)).not.toBe(plain)
		expect(await background(1)).toBe(plain)
	})

	test('select-all checks every row on the page', async ({ grid, page }) => {
		await toggle(selectAllCheckbox(page))

		const rows = await grid.rows().count()
		await expect(page.locator('[data-slot="tbody"]').getByRole('checkbox', { checked: true })).toHaveCount(rows)
	})
})

test.describe('the selection bar', () => {
	test.beforeEach(async ({ grid }) => {
		await grid.open(WITH_BAR)
	})

	test('stays down until something is selected', async ({ page }) => {
		await expect(page.locator(BAR_OPEN)).toHaveCount(0)
	})

	test('reports how many rows are selected', async ({ page }) => {
		await toggle(rowCheckboxes(page).first())
		await expect(page.locator(BAR_OPEN)).toHaveCount(1)
		await expect(page.locator(BAR)).toContainText('1')

		await toggle(rowCheckboxes(page).nth(1))
		await expect(page.locator(BAR)).toContainText('2')
	})

	test('counts every row select-all took, not just the visible page', async ({ grid, page }) => {
		await expect(grid.rows()).toHaveCount(PAGE_SIZE)

		await toggle(selectAllCheckbox(page))

		await expect(page.locator(BAR)).toContainText(String(TOTAL_ROWS))
	})

	test('goes back down when the selection is cleared', async ({ page }) => {
		await toggle(rowCheckboxes(page).first())
		await expect(page.locator(BAR_OPEN)).toHaveCount(1)

		await toggle(rowCheckboxes(page).first())
		await expect(page.locator(BAR_OPEN)).toHaveCount(0)
	})
})
