import { expect, test } from '../../../fixtures'

import type { Locator, Page } from '@playwright/test'

/**
 * The row-actions column: what it offers, and where.
 *
 * Every control is addressed by ARIA role and by the name the message dictionary gives it —
 * `rowActions.edit`, `rowActions.delete`, `rowActions.menu`, `rowActions.pinning` — plus each
 * custom entry's own `label`. The built-in four are icon-only in both kits, so a missing
 * accessible name makes them unreachable to a screen reader and to this spec at the same moment;
 * that is the assertion, not a lookup convenience.
 *
 * `placement` is the feature's whole point, so the two examples that differ by nothing else are
 * checked against each other: what is a button here has to be a menu entry there.
 */

const INLINE = 'row-actions-inline'
const MENU = 'row-actions-menu'
const CUSTOM_MENU = 'row-actions-custom'
const CUSTOM_INLINE = 'row-actions-custom-inline'
const COMPONENT = 'row-actions-component'

/** `makeUsers` marks every third user inactive, and the example disables Duplicate for those. */
const INACTIVE_ROW = 0
const ACTIVE_ROW = 1

const ACTIONS_CELL = '[data-slot="tbody"] [data-system-column="actions"]'

const actionsCell = (page: Page, index = 0) => page.locator(ACTIONS_CELL).nth(index)

const button = (scope: Locator | Page, name: string) => scope.getByRole('button', { name, exact: true })
const menuItem = (page: Page, name: string) => page.getByRole('menuitem', { name, exact: true })

test.describe("rowActions.placement: 'inline'", () => {
	test.beforeEach(async ({ grid }) => {
		await grid.open(INLINE)
	})

	test('gives edit and delete a button each', async ({ page }) => {
		const cell = actionsCell(page)

		await expect(button(cell, 'Edit')).toHaveCount(1)
		await expect(button(cell, 'Delete')).toHaveCount(1)
		// Not hidden behind anything: no overflow trigger for the row's own actions.
		await expect(button(cell, 'Row actions')).toHaveCount(0)
	})

	// Row pinning is the exception the option documents: its entries always share one trigger,
	// however the column is placed, because there are two of them per row and they are rare.
	test('still collapses row pinning behind one trigger', async ({ page }) => {
		const cell = actionsCell(page)
		await expect(button(cell, 'Row pinning')).toHaveCount(1)
		await expect(button(cell, 'Pin Top')).toHaveCount(0)

		await button(cell, 'Row pinning').click()

		await expect(menuItem(page, 'Pin Top')).toHaveCount(1)
		await expect(menuItem(page, 'Pin Bottom')).toHaveCount(1)
		// And the built-ins stayed out of it — they are buttons, not entries.
		await expect(menuItem(page, 'Edit')).toHaveCount(0)
	})

	test('edit raises the editing dialog for the row it sits on', async ({ grid, page }) => {
		await button(actionsCell(page), 'Edit').click()

		await expect(page.getByRole('dialog')).toHaveCount(1)
		await expect(page.getByRole('dialog')).toContainText('Edit')
		await expect(grid.rows()).toHaveCount(4)
	})

	test('delete removes that row', async ({ grid, page }) => {
		const before = await grid.columnText('name')
		expect(before.length).toBe(4)

		await button(actionsCell(page), 'Delete').click()

		await expect(grid.rows()).toHaveCount(3)
		expect(await grid.columnText('name')).not.toContain(before[0])
	})
})

test.describe("rowActions.placement: 'menu'", () => {
	test.beforeEach(async ({ grid }) => {
		await grid.open(MENU)
	})

	// The same grid as the block above, differing by this option alone.
	test('collapses every action behind one trigger', async ({ page }) => {
		const cell = actionsCell(page)

		await expect(button(cell, 'Row actions')).toHaveCount(1)
		await expect(button(cell, 'Edit')).toHaveCount(0)
		await expect(button(cell, 'Delete')).toHaveCount(0)
		await expect(button(cell, 'Row pinning')).toHaveCount(0)
	})

	test('the trigger opens a menu holding all four', async ({ page }) => {
		await button(actionsCell(page), 'Row actions').click()

		await expect(page.getByRole('menu')).toHaveCount(1)
		await expect(page.getByRole('menuitem')).toHaveCount(4)
		for (const name of ['Edit', 'Delete', 'Pin Top', 'Pin Bottom']) {
			await expect(menuItem(page, name), `no "${name}" entry in the row menu`).toHaveCount(1)
		}
	})

	test('an entry does what its button would have done', async ({ grid, page }) => {
		const before = await grid.columnText('name')

		await button(actionsCell(page), 'Row actions').click()
		await menuItem(page, 'Delete').click()

		await expect(grid.rows()).toHaveCount(3)
		expect(await grid.columnText('name')).not.toContain(before[0])
	})

	test('pinning a row from the menu moves it to the top', async ({ grid, page }) => {
		const before = await grid.columnText('name')

		await button(actionsCell(page, 1), 'Row actions').click()
		await menuItem(page, 'Pin Top').click()

		const after = await grid.columnText('name')
		expect(after[0], 'the pinned row did not move to the top').toBe(before[1])
		await expect(grid.rows().first()).toHaveAttribute('data-pinned', 'top')
	})
})

test.describe('rowActions.actions — a described entry', () => {
	// This example leaves `placement` at its default, so the column is inline — and a custom entry
	// that asks for nothing stays in the menu whatever the column does. That is the sharing rule:
	// Duplicate sits behind the overflow trigger *next to* the built-in buttons, not among them.
	test('stays in the menu while the built-in pair stay buttons', async ({ grid, page }) => {
		await grid.open(CUSTOM_MENU)
		const cell = actionsCell(page, ACTIVE_ROW)

		await expect(button(cell, 'Edit')).toHaveCount(1)
		await expect(button(cell, 'Delete')).toHaveCount(1)
		await expect(button(cell, 'Duplicate')).toHaveCount(0)

		await button(cell, 'Row actions').click()

		await expect(menuItem(page, 'Duplicate')).toHaveCount(1)
		// The pin entries share that same trigger rather than claiming one of their own.
		await expect(menuItem(page, 'Pin Top')).toHaveCount(1)
		await expect(menuItem(page, 'Edit')).toHaveCount(0)
	})

	test('runs its onAction', async ({ grid, page }) => {
		await grid.open(CUSTOM_MENU)
		const before = await grid.columnText('name')

		await button(actionsCell(page, ACTIVE_ROW), 'Row actions').click()
		await menuItem(page, 'Duplicate').click()

		await expect(grid.rows()).toHaveCount(before.length + 1)
		expect(await grid.columnText('name')).toContain(`${String(before[ACTIVE_ROW])} (copy)`)
	})

	// The entries are built per row, so `disabled` is a decision about *this* row — the example
	// refuses to duplicate an inactive user.
	test('is disabled on the row its callback said no to, and only there', async ({ grid, page }) => {
		await grid.open(CUSTOM_MENU)

		await button(actionsCell(page, INACTIVE_ROW), 'Row actions').click()
		await expect(menuItem(page, 'Duplicate')).toBeDisabled()
		await page.keyboard.press('Escape')

		await button(actionsCell(page, ACTIVE_ROW), 'Row actions').click()
		await expect(menuItem(page, 'Duplicate')).toBeEnabled()
	})
})

test.describe("rowActions.actions — an entry asking for placement: 'inline'", () => {
	test.beforeEach(async ({ grid }) => {
		await grid.open(CUSTOM_INLINE)
	})

	test('is drawn as a button, labelled by its own label', async ({ page }) => {
		const cell = actionsCell(page, ACTIVE_ROW)

		await expect(button(cell, 'Duplicate')).toHaveCount(1)
		await expect(button(cell, 'Send invoice')).toHaveCount(1)
		// It carries the slot that marks a custom inline entry, unlike the built-in pair.
		await expect(cell.locator('[data-slot="row-action"]')).toHaveCount(2)
	})

	test('its disabled state reaches the button', async ({ page }) => {
		await expect(button(actionsCell(page, INACTIVE_ROW), 'Duplicate')).toBeDisabled()
		await expect(button(actionsCell(page, ACTIVE_ROW), 'Duplicate')).toBeEnabled()
	})

	test('and pressing it runs the same handler', async ({ grid, page }) => {
		const before = await grid.columnText('name')

		await button(actionsCell(page, ACTIVE_ROW), 'Duplicate').click()

		await expect(grid.rows()).toHaveCount(before.length + 1)
		expect(await grid.columnText('name')).toContain(`${String(before[ACTIVE_ROW])} (copy)`)
	})
})

/**
 * The other half of `actions`: an entry that hands over markup instead of a description. The kit
 * contributes nothing around it — no glyph, no danger colour, no disabled state — so what is
 * checked is that the markup arrives intact and still works inside the menu.
 */
test.describe('rowActions.actions — a component entry', () => {
	test.beforeEach(async ({ grid }) => {
		await grid.open(COMPONENT)
	})

	test('renders its own markup inside the menu, beside a described entry', async ({ page }) => {
		await button(actionsCell(page), 'Row actions').click()

		await expect(page.getByRole('menu')).toContainText('Seats')
		await expect(page.getByRole('menu').getByRole('button', { name: 'Add a seat' })).toHaveCount(1)
		// The described entry next to it is still an entry the kit drew.
		await expect(menuItem(page, 'Archive')).toHaveCount(1)
	})

	test('its own controls work where they are', async ({ page }) => {
		await button(actionsCell(page), 'Row actions').click()
		const menu = page.getByRole('menu')

		await menu.getByRole('button', { name: 'Add a seat' }).click()

		// The example logs every change, which is how the click is proved to have reached the row.
		await expect(page.getByText('2 seat(s)')).toHaveCount(1)
	})
})
