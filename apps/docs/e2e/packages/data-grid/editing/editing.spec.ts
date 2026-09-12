import { expect, test } from '../../../fixtures'

import type { Locator, Page } from '@playwright/test'

/**
 * Editing an existing row, in all three modes.
 *
 * Every control here is addressed by ARIA role and by the name the grid's own message
 * dictionary gives it — `rowActions.edit`, `form.save`, `form.cancel`. That is deliberate and
 * it is the assertion: all four are icon-only buttons in both kits, so a missing `aria-label`
 * makes them unreachable to a screen reader *and* to this spec at the same moment. Addressing
 * them by `data-slot` would have hidden exactly the defect that writing this file uncovered.
 *
 * What is checked is that a value reaches the row, not that an input appeared: a cell showing
 * an `<input>` proves the edit opened and nothing about whether Save does anything.
 */

const ROW_MODE = 'editing-mode-row'
const MODAL_MODE = 'editing-mode-modal'
const CELL_MODE = 'editing-mode-cell'
const VALIDATION = 'editing-validation'

/** From `apps/docs/shared/data-grid/examples/components/_data.ts` — the first user. */
const ALICE = 'Alice Johnson'
const EDITED = 'Alice Cooper'

const editButton = (row: Locator) => row.getByRole('button', { name: 'Edit' })
const saveButton = (scope: Locator | Page) => scope.getByRole('button', { name: 'Save', exact: true })
const cancelButton = (scope: Locator | Page) => scope.getByRole('button', { name: 'Cancel', exact: true })

/** The one text box inside a cell that has been opened for editing. */
const editorIn = (cell: Locator) => cell.getByRole('textbox')

test.describe("editing.mode: 'row'", () => {
	test.beforeEach(async ({ grid }) => {
		await grid.open(ROW_MODE)
	})

	test('turns the row it is opened on into inputs, and leaves its neighbours alone', async ({ grid }) => {
		await editButton(grid.rows().first()).click()

		await expect(editorIn(await grid.cell(0, 'name'))).toHaveValue(ALICE)
		// The control, not the attribute: the second row must still be *text*.
		await expect((await grid.cell(1, 'name')).getByRole('textbox')).toHaveCount(0)
	})

	test('swaps the row actions for save and cancel while the row is open', async ({ grid }) => {
		const row = grid.rows().first()
		await expect(saveButton(row)).toHaveCount(0)

		await editButton(row).click()

		await expect(saveButton(row)).toHaveCount(1)
		await expect(cancelButton(row)).toHaveCount(1)
		await expect(editButton(row)).toHaveCount(0)
	})

	test('save writes the typed value back to the row', async ({ grid }) => {
		const row = grid.rows().first()
		await editButton(row).click()
		await editorIn(await grid.cell(0, 'name')).fill(EDITED)
		await saveButton(row).click()

		await expect(await grid.cell(0, 'name')).toHaveText(EDITED)
		// Closed, not merely rewritten: the cell is text again.
		await expect((await grid.cell(0, 'name')).getByRole('textbox')).toHaveCount(0)
	})

	test('cancel throws the typed value away', async ({ grid }) => {
		const row = grid.rows().first()
		await editButton(row).click()
		await editorIn(await grid.cell(0, 'name')).fill(EDITED)
		await cancelButton(row).click()

		await expect(await grid.cell(0, 'name')).toHaveText(ALICE)
	})
})

test.describe("editing.mode: 'modal'", () => {
	test.beforeEach(async ({ grid }) => {
		await grid.open(MODAL_MODE)
	})

	test('raises a dialog rather than opening the row', async ({ grid, page }) => {
		await expect(page.getByRole('dialog')).toHaveCount(0)

		await editButton(grid.rows().first()).click()

		const dialog = page.getByRole('dialog')
		await expect(dialog).toHaveCount(1)
		// The generated form, one field per editable column, labelled by the column header.
		await expect(dialog.getByLabel('Name')).toHaveValue(ALICE)
		// The row itself stayed a row.
		await expect((await grid.cell(0, 'name')).getByRole('textbox')).toHaveCount(0)
	})

	test('save closes the dialog and writes the value back to the row', async ({ grid, page }) => {
		await editButton(grid.rows().first()).click()
		const dialog = page.getByRole('dialog')
		await dialog.getByLabel('Name').fill(EDITED)
		await saveButton(dialog).click()

		await expect(dialog).toHaveCount(0)
		await expect(await grid.cell(0, 'name')).toHaveText(EDITED)
	})

	test('cancel closes the dialog and changes nothing', async ({ grid, page }) => {
		await editButton(grid.rows().first()).click()
		const dialog = page.getByRole('dialog')
		await dialog.getByLabel('Name').fill(EDITED)
		await cancelButton(dialog).click()

		await expect(dialog).toHaveCount(0)
		await expect(await grid.cell(0, 'name')).toHaveText(ALICE)
	})

	test('Escape dismisses the dialog and changes nothing', async ({ grid, page }) => {
		await editButton(grid.rows().first()).click()
		await page.getByRole('dialog').getByLabel('Name').fill(EDITED)
		await page.keyboard.press('Escape')

		await expect(page.getByRole('dialog')).toHaveCount(0)
		await expect(await grid.cell(0, 'name')).toHaveText(ALICE)
	})
})

test.describe("editing.mode: 'cell'", () => {
	test.beforeEach(async ({ grid }) => {
		await grid.open(CELL_MODE)
	})

	test('opens the double-clicked cell and only that cell', async ({ grid }) => {
		const cell = await grid.cell(0, 'name')
		await cell.dblclick()

		await expect(editorIn(cell)).toHaveValue(ALICE)
		await expect((await grid.cell(0, 'email')).getByRole('textbox')).toHaveCount(0)
		await expect((await grid.cell(1, 'name')).getByRole('textbox')).toHaveCount(0)
	})

	test('offers no save or cancel pair — the keyboard ends the edit', async ({ grid, page }) => {
		await (await grid.cell(0, 'name')).dblclick()

		// Cell mode raises no row-level controls at all: `hasEditing` is false for it in
		// `actions-cell.tsx`, so a grid whose only row feature is cell editing grows no actions
		// column, and an open cell adds nothing beside itself.
		await expect(saveButton(page)).toHaveCount(0)
		await expect(cancelButton(page)).toHaveCount(0)
		await expect(editButton(grid.rows().first())).toHaveCount(0)
	})

	test('Enter commits the typed value to the row', async ({ grid, page }) => {
		const cell = await grid.cell(0, 'name')
		await cell.dblclick()
		await editorIn(cell).fill(EDITED)
		await page.keyboard.press('Enter')

		await expect(await grid.cell(0, 'name')).toHaveText(EDITED)
		await expect((await grid.cell(0, 'name')).getByRole('textbox')).toHaveCount(0)
	})

	test('Escape abandons it', async ({ grid, page }) => {
		const cell = await grid.cell(0, 'name')
		await cell.dblclick()
		await editorIn(cell).fill(EDITED)
		await page.keyboard.press('Escape')

		await expect(await grid.cell(0, 'name')).toHaveText(ALICE)
	})
})

test.describe('editing.validate', () => {
	test.beforeEach(async ({ grid }) => {
		await grid.open(VALIDATION)
	})

	// The schema in the example wants two characters or more.
	test('a value the schema rejects blocks the save and says why', async ({ grid }) => {
		const row = grid.rows().first()
		await editButton(row).click()
		await editorIn(await grid.cell(0, 'name')).fill('A')
		await saveButton(row).click()

		await expect(row).toContainText('must be at least 2 chars')
		// Still open, and the row underneath is untouched.
		await expect(saveButton(row)).toHaveCount(1)
		await expect(editorIn(await grid.cell(0, 'name'))).toHaveValue('A')
	})

	// `onSave` throws a `ValidationError` for this address after a delay — a rejection that only
	// the server could know about, arriving after the schema has already passed.
	test('a rejection from onSave lands on the field it names', async ({ grid }) => {
		const row = grid.rows().first()
		await editButton(row).click()
		await editorIn(await grid.cell(0, 'email')).fill('taken@example.com')
		await saveButton(row).click()

		await expect(row).toContainText('already in use')
		await expect(saveButton(row)).toHaveCount(1)
	})

	test('a value the schema accepts saves', async ({ grid }) => {
		const row = grid.rows().first()
		await editButton(row).click()
		await editorIn(await grid.cell(0, 'name')).fill(EDITED)
		await saveButton(row).click()

		await expect(await grid.cell(0, 'name')).toHaveText(EDITED)
	})
})
