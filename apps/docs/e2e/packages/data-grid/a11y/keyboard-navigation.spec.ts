import { expect, test } from '../../../fixtures'

import type { Page } from '@playwright/test'

/**
 * The grid's focus model, in a real browser, for both kits — because the two reach the same
 * behaviour by completely different routes and only the behaviour is worth asserting.
 *
 * shadcn runs the package's own model, registered by the kit through
 * `createDataGrid({ keyboardNavigation: true })`. heroui does not and must not: its table is
 * React Aria's, which brings a roving focus manager of its own. So the cases below are written
 * against what a user does — Tab in, arrow around — and pass in both kits for different reasons.
 * Where the two legitimately differ, the case says which kit it is about and why.
 */

/**
 * A cell, in whichever kit.
 *
 * shadcn's roles are written by the package's own focus model; heroui's come from React Aria,
 * which names a row's first cell `rowheader` rather than `gridcell`. Addressing the union keeps
 * the cases below about behaviour rather than about which library produced the role.
 */
const CELL_ROLES = ['gridcell', 'columnheader', 'rowheader'] as const
const CELL = CELL_ROLES.map((role) => `[role="${role}"]`).join(', ')

/**
 * The same union, each member carrying `qualifier`.
 *
 * A selector list binds a trailing qualifier to its **last** member only, so the obvious
 * `` `${CELL}[tabindex="0"]` `` counts every cell plus the qualified ones — which is exactly
 * how this file first reported 66 tab stops on a grid that had one.
 */
const cellsWhere = (qualifier: string) => CELL_ROLES.map((role) => `[role="${role}"]${qualifier}`).join(', ')

/** Where the caret counts as "in the grid" — a cell, or the row React Aria focuses instead. */
const IN_GRID = `${CELL}, [role="row"]`

/** Focus the grid the way a keyboard user reaches it, and hand back what the caret landed on. */
async function enterGrid(page: Page) {
	await page.locator(CELL).first().waitFor()
	// Tab from the top of the document until the caret is inside the grid. Bounded, so a grid
	// that never takes focus fails here rather than hanging.
	for (let press = 0; press < 40; press++) {
		await page.keyboard.press('Tab')
		const inside = await page.evaluate((selector) => document.activeElement?.closest(selector) != null, IN_GRID)
		if (inside) return
	}
	throw new Error('Tab never reached a grid cell')
}

/** A stable description of the focused element, for comparing before and after a key press. */
function focusedDescription(page: Page) {
	return page.evaluate(() => {
		const active = document.activeElement
		if (!(active instanceof HTMLElement)) return null
		const selector = '[role="gridcell"], [role="columnheader"], [role="rowheader"]'
		const cell = active.closest<HTMLElement>(selector) ?? active
		const row = cell.closest<HTMLElement>('[data-slot="tr"]')
		const rows = [...document.querySelectorAll('[data-slot="tr"]')]
		const cells = row === null ? [] : [...row.querySelectorAll(selector)]
		return { row: row === null ? -1 : rows.indexOf(row), cell: cells.indexOf(cell) }
	})
}

test('arrow keys move the caret between cells', async ({ page, grid }) => {
	await grid.open('base-full')
	await enterGrid(page)

	const start = await focusedDescription(page)
	expect(start).not.toBeNull()

	await page.keyboard.press('ArrowDown')
	const afterDown = await focusedDescription(page)
	expect(afterDown?.row, 'ArrowDown moves to another row').not.toBe(start?.row)

	await page.keyboard.press('ArrowRight')
	const afterRight = await focusedDescription(page)
	expect(afterRight?.cell, 'ArrowRight moves to another cell').not.toBe(afterDown?.cell)
})

test('the caret stays in the grid at the first row', async ({ page, grid, kit }) => {
	// About this package's model, which clamps at the first row. What React Aria does at its own
	// edge is heroui's business and is asserted by neither this file nor that kit's own tests.
	test.skip(kit !== 'shadcn', "heroui's edge behaviour is React Aria's")

	await grid.open('base-full')
	await enterGrid(page)

	for (let press = 0; press < 5; press++) await page.keyboard.press('ArrowUp')

	const focused = await focusedDescription(page)
	expect(focused, 'the caret is still on a cell').not.toBeNull()
	expect(focused?.row).toBeGreaterThanOrEqual(0)
})

test('the grid is one tab stop, whatever the row count', async ({ page, grid, kit }) => {
	// shadcn only. heroui's tab order is React Aria's — three to four stops, also independent of
	// the row count, but not one — and this kit does not run the package's model at all.
	test.skip(kit !== 'shadcn', "heroui brings React Aria's own focus manager")

	await grid.open('base-full')
	await enterGrid(page)

	const stops = await page.locator(cellsWhere('[tabindex="0"]')).count()
	expect(stops, 'exactly one cell carries the tab stop').toBe(1)

	// And nothing inside a cell is tabbable, which is the half that actually collapses the count:
	// before this, Tab walked every sort trigger, checkbox and menu button in turn.
	const tabbableControls = await page.evaluate((selector) => {
		const cells = [...document.querySelectorAll(selector)]
		return cells.flatMap((cell) =>
			[...cell.querySelectorAll<HTMLElement>('button, input, select, textarea, a[href]')].filter(
				(el) => el.tabIndex !== -1,
			),
		).length
	}, CELL)
	expect(tabbableControls, 'no control inside a cell is in the tab order').toBe(0)
})
