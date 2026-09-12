import { expect, test, toggle } from '../../../fixtures'

import type { Locator, Page } from '@playwright/test'

/**
 * Deleting a row, and the confirmation standing in front of it.
 *
 * The confirmation is a kit dialog, never a native `confirm()` — which matters here beyond
 * style: a native dialog would block the page and take the whole run down with it. Insisting
 * on a role is therefore load-bearing, not decorative; see {@link confirmation}.
 *
 * Both halves are checked for each path: that cancelling keeps the row, and that confirming
 * removes *that* row and not merely *a* row.
 */

const EXAMPLE = 'delete-confirmation'

/** `PRODUCT_DATA` in `apps/docs/shared/data-grid/examples/components/_data.ts`. */
const INITIAL_ROWS = 6
const FIRST = 'Wireless Headphones'
const SECOND = 'Cotton T-Shirt'

const deleteButton = (scope: Locator | Page) => scope.getByRole('button', { name: 'Delete', exact: true })
const cancelButton = (scope: Locator | Page) => scope.getByRole('button', { name: 'Cancel', exact: true })

/**
 * The confirmation — `alertdialog` in both kits, and the spec holds them to it.
 *
 * What this prompt asks is destructive and irreversible, which is the WAI-ARIA alertdialog
 * pattern rather than the dialog one: the prompt is announced as an alert rather than read only
 * once focus lands inside it, and a stray click on the backdrop is not an answer. shadcn was
 * always on Radix's `AlertDialog`; HeroUI's `ConfirmDialog` was a plain `Modal` (`role="dialog"`)
 * until it moved to HeroUI's own `AlertDialog`. Accepting either role would let that regress
 * back unnoticed, so this names the one.
 */
const confirmation = (page: Page) => page.getByRole('alertdialog')

const rowCheckboxes = (page: Page) => page.locator('[data-slot="tbody"]').getByRole('checkbox')

test.describe('deleting a single row', () => {
	test.beforeEach(async ({ grid }) => {
		await grid.open(EXAMPLE)
	})

	test('asks before deleting, naming the row it is about to remove', async ({ grid, page }) => {
		await deleteButton(grid.rows().first()).click()

		const dialog = confirmation(page)
		await expect(dialog).toHaveCount(1)
		// `confirmation.description` is a function of the row in this example.
		await expect(dialog).toContainText(FIRST)
		// Nothing has gone yet.
		await expect(grid.rows()).toHaveCount(INITIAL_ROWS)
	})

	test('cancelling keeps the row', async ({ grid, page }) => {
		await deleteButton(grid.rows().first()).click()
		await cancelButton(confirmation(page)).click()

		await expect(confirmation(page)).toHaveCount(0)
		await expect(grid.rows()).toHaveCount(INITIAL_ROWS)
		expect(await grid.columnText('name')).toContain(FIRST)
	})

	test('Escape keeps the row', async ({ grid, page }) => {
		await deleteButton(grid.rows().first()).click()
		// That the prompt went up is asserted before dismissing it: without this the test also
		// passes when the confirmation never appeared at all, since the assertion below is that
		// it is gone. Escape is the safe answer to a delete prompt, so it must reach a real one.
		await expect(confirmation(page)).toHaveCount(1)
		await page.keyboard.press('Escape')

		await expect(confirmation(page)).toHaveCount(0)
		await expect(grid.rows()).toHaveCount(INITIAL_ROWS)
	})

	test('confirming removes that row and leaves the rest', async ({ grid, page }) => {
		await deleteButton(grid.rows().first()).click()
		await deleteButton(confirmation(page)).click()

		await expect(grid.rows()).toHaveCount(INITIAL_ROWS - 1)
		const names = await grid.columnText('name')
		expect(names).not.toContain(FIRST)
		expect(names).toContain(SECOND)
	})
})

test.describe('deleting a selection', () => {
	test.beforeEach(async ({ grid }) => {
		await grid.open(EXAMPLE)
	})

	test('confirms in the plural and removes exactly the selected rows', async ({ grid, page }) => {
		await toggle(rowCheckboxes(page).first())
		await toggle(rowCheckboxes(page).nth(1))

		await deleteButton(page.locator('[data-slot="selection-bar"]')).click()

		const dialog = confirmation(page)
		// `bulk.confirmation.description` is a function of the selected rows.
		await expect(dialog).toContainText('2 products')
		await deleteButton(dialog).click()

		await expect(grid.rows()).toHaveCount(INITIAL_ROWS - 2)
		const names = await grid.columnText('name')
		expect(names).not.toContain(FIRST)
		expect(names).not.toContain(SECOND)
	})

	test('cancelling keeps every selected row', async ({ grid, page }) => {
		await toggle(rowCheckboxes(page).first())
		await deleteButton(page.locator('[data-slot="selection-bar"]')).click()
		await cancelButton(confirmation(page)).click()

		await expect(grid.rows()).toHaveCount(INITIAL_ROWS)
		expect(await grid.columnText('name')).toContain(FIRST)
	})
})
