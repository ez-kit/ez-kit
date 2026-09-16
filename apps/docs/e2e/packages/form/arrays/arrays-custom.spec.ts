import { expect, test } from '../../../fixtures'

import type { Page } from '@playwright/test'

/**
 * `form.Array`, the headless primitive, driven through a hand-drawn `<table>` (`form-arrays-custom`).
 *
 * The primitive renders nothing of its own — no wrapper, no `data-field` on the array itself —
 * so `form.items()` / `form.item()` cannot be used here: both resolve through `field(arrayName)`,
 * which addresses an element this example never renders. They also resolve through the
 * `form-array-item` slot, which the author's own `<tr>` rows do not carry — this example draws
 * its own rows on purpose, and giving them the kit's slot would defeat the point of the case.
 *
 * Entries are counted and reached instead by `data-field`, the one thing every field carries
 * regardless of who drew the row: `[data-field^="lines["][data-field$=".sku"]` is exactly one
 * element per entry, since each entry has exactly one `sku` field.
 */
const EXAMPLE = 'form-arrays-custom'

const ADD = 'Add line'
const SAVE = 'Save'

type Order = { reference: string; lines: { sku: string; qty: number }[] }

const lineRows = (page: Page) => page.locator('[data-field^="lines["][data-field$=".sku"]')
const duplicateButton = (page: Page, index: number) => page.getByRole('button', { name: `Duplicate ${String(index)}` })
const removeButton = (page: Page, index: number) => page.getByRole('button', { name: `Remove ${String(index)}` })
const upButton = (page: Page, index: number) => page.getByRole('button', { name: `Up ${String(index)}` })

test.describe('an array composed by hand', () => {
	test.beforeEach(async ({ form }) => {
		await form.open(EXAMPLE)
	})

	test('adds an entry from a control the composition could not place', async ({ form, page }) => {
		await expect(lineRows(page)).toHaveCount(1)

		await page.getByRole('button', { name: ADD }).click()
		await expect(lineRows(page)).toHaveCount(2)

		await form.input('lines[1].sku').fill('EZ-200')
		await page.getByRole('button', { name: SAVE }).click()

		expect(await form.submitted()).toEqual({
			reference: 'PO-1042',
			lines: [
				{ sku: 'EZ-100', qty: 2 },
				{ sku: 'EZ-200', qty: 1 },
			],
		} satisfies Order)
	})

	/**
	 * The identity probe. `insert` at a middle index must not renumber the entries around it: the
	 * survivor that was at index 1 has to keep its own value at its new index, not the value that
	 * sits at the same index today. An implementation that inserted by shifting values across
	 * fixed slots — rather than splicing a fresh entry into the list — would show `EZ-200` at
	 * index 1 here instead of a blank entry, which is exactly what the two assertions below rule
	 * out before the payload is even checked.
	 */
	test('inserts a fresh entry directly below the one asked for', async ({ form, page }) => {
		await page.getByRole('button', { name: ADD }).click()
		await form.input('lines[1].sku').fill('EZ-200')

		await duplicateButton(page, 1).click()
		await expect(lineRows(page)).toHaveCount(3)

		await expect(form.input('lines[1].sku')).toHaveValue('')
		await expect(form.input('lines[2].sku')).toHaveValue('EZ-200')

		await page.getByRole('button', { name: SAVE }).click()
		expect(await form.submitted()).toEqual({
			reference: 'PO-1042',
			lines: [
				{ sku: 'EZ-100', qty: 2 },
				{ sku: '', qty: 1 },
				{ sku: 'EZ-200', qty: 1 },
			],
		} satisfies Order)
	})

	/**
	 * The removal probe. Only the entry whose own `Remove` control was clicked should go; its
	 * neighbour must survive with its own value. A `remove` that dropped the wrong index, or one
	 * keyed by position rather than identity, would submit `EZ-100` instead of `EZ-200` here.
	 */
	test('removes the entry whose own control was clicked', async ({ form, page }) => {
		await page.getByRole('button', { name: ADD }).click()
		await form.input('lines[1].sku').fill('EZ-200')

		await removeButton(page, 1).click()
		await expect(lineRows(page)).toHaveCount(1)

		await page.getByRole('button', { name: SAVE }).click()
		expect(await form.submitted()).toEqual({
			reference: 'PO-1042',
			lines: [{ sku: 'EZ-200', qty: 1 }],
		} satisfies Order)
	})

	test('disables the up control on the first entry only', async ({ page }) => {
		await page.getByRole('button', { name: ADD }).click()

		await expect(upButton(page, 1)).toBeDisabled()
		await expect(upButton(page, 2)).toBeEnabled()
	})
})
