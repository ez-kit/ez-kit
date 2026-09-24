import { expect, test } from '../../../fixtures'

import type { Locator, Page } from '@playwright/test'

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
 * element per entry, since each entry has exactly one `sku` field. That assumption breaks for a
 * nested `lines[i].meta.sku` (two matches per entry, the suffix matcher cannot tell them apart)
 * and for an entry whose `sku` field failed to render (silently not counted as a row) — neither
 * happens in this example, so the locator is left as the entry count rather than reached for
 * `form-array-item`, which this example's rows do not carry (see above).
 */
const EXAMPLE = 'form-arrays-custom'

const ADD = 'Add line'
const SAVE = 'Save'

type Order = { reference: string; lines: { sku: string; qty: number }[] }

const lineRows = (page: Page) => page.locator('[data-field^="lines["][data-field$=".sku"]')
const duplicateButton = (page: Page, index: number) => page.getByRole('button', { name: `Duplicate ${String(index)}` })
const removeButton = (page: Page, index: number) => page.getByRole('button', { name: `Remove ${String(index)}` })
const upButton = (page: Page, index: number) => page.getByRole('button', { name: `Up ${String(index)}` })

/**
 * The caret, read and written directly — see `arrays.spec.ts`'s own copy of this pair for why:
 * `selectionStart` belongs to the DOM node, not to React, and survives the node being re-pointed
 * at another entry's value, which is exactly what makes it a witness for whether the node
 * travelled with its entry rather than being reused for whichever entry now renders at its slot.
 */
async function caretTo(input: Locator, offset: number): Promise<void> {
	await input.evaluate((element, at) => {
		;(element as HTMLInputElement).setSelectionRange(at, at)
	}, offset)
}

async function caretOf(input: Locator): Promise<number | null> {
	return input.evaluate((element) => (element as HTMLInputElement).selectionStart)
}

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
	 * The ordering probe, plus a real identity witness.
	 *
	 * `insert` at a middle index must not renumber the entries around it: the survivor that was
	 * at index 1 has to keep its own value at its new index, not the value that sits at the same
	 * index today. An implementation that inserted by shifting values across fixed slots — rather
	 * than splicing a fresh entry into the list — would show `EZ-200` at index 1 here instead of a
	 * blank entry, which the value and payload assertions below rule out. Those assertions alone
	 * do *not* prove entry identity, though: every value here re-renders from form state by path,
	 * so a `<tr>` keyed by `item.index` instead of `item.key` — the mistake this example exists to
	 * get right — would still show the correct value at the correct path after React reuses the
	 * wrong DOM node for it. `arrays.spec.ts` spends a caret witness on exactly this gap for
	 * `ArrayField`'s own row; the hand-drawn `<tr>` here is the one surface nothing else exercises.
	 * The caret belongs to the DOM node, not to the controlled value, so it survives an insert only
	 * if the node that already held `EZ-200` travels with its entry down to index 2, rather than
	 * being reused in place for the freshly inserted entry at index 1.
	 */
	test('inserts a fresh entry directly below the one asked for', async ({ form, page }) => {
		await page.getByRole('button', { name: ADD }).click()
		await form.input('lines[1].sku').fill('EZ-200')
		await caretTo(form.input('lines[1].sku'), 2)

		await duplicateButton(page, 1).click()
		await expect(lineRows(page)).toHaveCount(3)

		await expect(form.input('lines[1].sku')).toHaveValue('')
		await expect(form.input('lines[2].sku')).toHaveValue('EZ-200')
		expect(await caretOf(form.input('lines[2].sku'))).toBe(2)

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
