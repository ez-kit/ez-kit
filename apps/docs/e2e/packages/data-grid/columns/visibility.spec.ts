import { expect, test } from '../../../fixtures'

import type { Locator, Page } from '@playwright/test'

/**
 * Hiding and showing columns, from the toolbar control and from a column's own menu.
 *
 * What is asserted is the **body**, not the header: a column is hidden when its cells stop being
 * rendered, and a header-only check would pass on a grid that left a column of stray cells
 * behind. `grid.columnText` resolves a column through its header, so it throws when the column is
 * gone — which is why the counts below are read from the row.
 */

const EXAMPLE = 'column-visibility'

/** The example's six columns, two of them `initialHidden`. */
const VISIBLE_AT_START = ['name', 'email', 'role', 'department']
const HIDDEN_AT_START = ['salary', 'startDate']
/** `name` opts out with `visibility: false`, so it is not offered. */
const TOGGLEABLE = 5

/**
 * A column's toggle in the toolbar control, whichever way the kit draws that control.
 *
 * The kits diverge here and both readings are legitimate: shadcn opens a popover of labelled
 * checkboxes, HeroUI a menu of `menuitemcheckbox` entries. Both toggle the same column and both
 * carry the column's label as their accessible name, so the spec accepts either role rather than
 * dictating which overlay a kit uses — this is presentation, which is the kit's job. What it does
 * insist on is that the control is *a named, checkable thing*, which is the part a screen-reader
 * user needs either way.
 */
const columnToggle = (page: Page, label: string): Locator =>
	page
		.getByRole('menuitemcheckbox', { name: label, exact: true })
		.or(page.getByRole('checkbox', { name: label, exact: true }))

const columnsTrigger = (page: Page) => page.getByRole('button', { name: 'Columns' })

/** Ids of the columns the body is currently rendering, read from the header row. */
const renderedColumns = (page: Page): Promise<string[]> =>
	page
		.locator('[data-slot="thead"] [data-slot="th"][data-column-id]')
		.evaluateAll((ths) => ths.map((th) => th.getAttribute('data-column-id') ?? ''))

/** How many cells a body row actually has — the count that proves a column left the body. */
const cellsPerRow = (grid: { rows: () => Locator }): Promise<number> =>
	grid.rows().first().locator('[data-slot="td"]').count()

const columnMenuTrigger = (grid: { header: (id: string) => Locator }, columnId: string) =>
	grid.header(columnId).getByRole('button', { name: 'Column options' })

test.describe('column visibility', () => {
	test.beforeEach(async ({ grid }) => {
		await grid.open(EXAMPLE)
	})

	test('starts with the initially hidden columns out of the table', async ({ grid, page }) => {
		expect(await renderedColumns(page)).toEqual(VISIBLE_AT_START)
		expect(await cellsPerRow(grid)).toBe(VISIBLE_AT_START.length)
	})

	test('the toolbar control offers every column that did not opt out', async ({ page }) => {
		await columnsTrigger(page).click()

		await expect(columnToggle(page, 'Email')).toHaveCount(1)
		await expect(columnToggle(page, 'Salary')).toHaveCount(1)
		// `visibility: false` — always visible, and not offered as a toggle.
		await expect(columnToggle(page, 'Name')).toHaveCount(0)
	})

	test('its toggles report which columns are showing', async ({ page }) => {
		await columnsTrigger(page).click()

		await expect(columnToggle(page, 'Email')).toBeChecked()
		await expect(columnToggle(page, 'Salary')).not.toBeChecked()
	})

	test('turning one on brings its cells into the body', async ({ grid, page }) => {
		await columnsTrigger(page).click()
		await columnToggle(page, 'Salary').click()

		await expect.poll(() => renderedColumns(page)).toContain('salary')
		expect(await cellsPerRow(grid)).toBe(VISIBLE_AT_START.length + 1)
		// The values came with it.
		expect((await grid.columnText('salary'))[0]).not.toBe('')
	})

	test('turning one off takes them out again', async ({ grid, page }) => {
		await columnsTrigger(page).click()
		await columnToggle(page, 'Email').click()

		await expect.poll(() => renderedColumns(page)).not.toContain('email')
		expect(await cellsPerRow(grid)).toBe(VISIBLE_AT_START.length - 1)
	})

	test('the count of toggles matches the columns that can be hidden', async ({ page }) => {
		await columnsTrigger(page).click()

		const toggles = page.getByRole('menuitemcheckbox').or(page.getByRole('checkbox'))
		await expect(toggles).toHaveCount(TOGGLEABLE)
	})
})

test.describe('hiding a column from its own menu', () => {
	test.beforeEach(async ({ grid }) => {
		await grid.open(EXAMPLE)
	})

	test('the menu offers Hide, and hiding removes the column', async ({ grid, page }) => {
		await columnMenuTrigger(grid, 'email').click()
		await expect(page.getByRole('menuitem', { name: 'Hide', exact: true })).toHaveCount(1)

		await page.getByRole('menuitem', { name: 'Hide', exact: true }).click()

		await expect.poll(() => renderedColumns(page)).not.toContain('email')
		expect(await cellsPerRow(grid)).toBe(VISIBLE_AT_START.length - 1)
	})

	// The same opt-out that keeps `name` out of the toolbar list keeps Hide out of its menu —
	// otherwise the column could be hidden with no way to bring it back.
	test('a column that opted out is offered no Hide at all', async ({ grid, page }) => {
		await columnMenuTrigger(grid, 'name').click()

		await expect(page.getByRole('menuitem', { name: 'Hide', exact: true })).toHaveCount(0)
		// The menu did open — this is not a missing trigger.
		await expect(page.getByRole('menuitem', { name: 'Asc', exact: true })).toHaveCount(1)
	})

	test('a column hidden from the menu can be brought back from the toolbar', async ({ grid, page }) => {
		await columnMenuTrigger(grid, 'email').click()
		await page.getByRole('menuitem', { name: 'Hide', exact: true }).click()
		await expect.poll(() => renderedColumns(page)).not.toContain('email')

		await columnsTrigger(page).click()
		await columnToggle(page, 'Email').click()

		await expect.poll(() => renderedColumns(page)).toContain('email')
	})
})

test.describe('hidden columns and the rest of the grid', () => {
	// A hidden column must not leave a gap in the track list: the remaining columns have to fill
	// the table, not sit beside an empty slot where the hidden one used to be.
	test('the visible columns still span the table', async ({ grid, page }) => {
		await grid.open(EXAMPLE)
		const tableWidth = await grid
			.header('name')
			.evaluate((th) => th.closest('table')?.getBoundingClientRect().width ?? 0)

		await columnsTrigger(page).click()
		await columnToggle(page, 'Email').click()
		await expect.poll(() => renderedColumns(page)).not.toContain('email')
		await page.keyboard.press('Escape')

		const cells = await grid
			.rows()
			.first()
			.locator('[data-slot="td"]')
			.evaluateAll((tds) => tds.reduce((sum, td) => sum + td.getBoundingClientRect().width, 0))
		expect(Math.abs(cells - tableWidth)).toBeLessThan(4)
	})

	test('hidden columns stay hidden across a sort', async ({ grid, page }) => {
		await grid.open(EXAMPLE)
		await columnsTrigger(page).click()
		await columnToggle(page, 'Email').click()
		await expect.poll(() => renderedColumns(page)).not.toContain('email')
		await page.keyboard.press('Escape')

		await grid.sortTrigger('name').click()
		await expect.poll(() => grid.sortDirection('name')).toBe('asc')

		expect(await renderedColumns(page)).not.toContain('email')
	})
})

test.describe('initial hidden state', () => {
	test('an initially hidden column is hidden, not missing', async ({ grid, page }) => {
		await grid.open(EXAMPLE)

		for (const id of HIDDEN_AT_START) {
			expect(await renderedColumns(page), `${id} should start hidden`).not.toContain(id)
		}

		// It is a column of the grid all the same: the toolbar offers it, and turning it on works.
		await columnsTrigger(page).click()
		await columnToggle(page, 'Start Date').click()

		await expect.poll(() => renderedColumns(page)).toContain('startDate')
	})
})
