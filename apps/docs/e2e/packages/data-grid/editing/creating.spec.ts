import { expect, test } from '../../../fixtures'

import type { Locator, Page } from '@playwright/test'

/**
 * Creating a row, in all three modes.
 *
 * Where the draft lives is the whole difference between the modes, so that is what each block
 * establishes first: `row` opens one inside the body on demand, `pin-row` keeps one there
 * permanently, `modal` puts it in a dialog and leaves the body alone.
 *
 * The draft row is addressed by `data-creating-row` rather than through `grid.rows()`. It is
 * not a row of the data: it carries no `data-row-id`, which is exactly what keeps it out of
 * the fixture's row locator — so "one more row than before" stays a real assertion about the
 * data rather than about the draft.
 */

const ROW_MODE = 'creating-row'
const MODAL_MODE = 'creating-modal'
const PIN_ROW_MODE = 'creating-pin-row'
const VALIDATION = 'creating-validation'

/** `INITIAL_DATA` in `apps/docs/shared/data-grid/examples/components/_data.ts`. */
const INITIAL_ROWS = 5
const NEW_NAME = 'Frank Miller'

const DRAFT_ROW = '[data-creating-row]'

const addButton = (page: Page) => page.getByRole('button', { name: '+ Add' })
const saveButton = (scope: Locator | Page) => scope.getByRole('button', { name: 'Save', exact: true })
const cancelButton = (scope: Locator | Page) => scope.getByRole('button', { name: 'Cancel', exact: true })

/**
 * A generated form field, by the label its column header gave it.
 *
 * `getByLabel` alone is not enough for a number column: HeroUI's NumberField points its stepper
 * buttons at the field's label as well (`aria-labelledby`), so one label matches three elements.
 * Naming the roles an input can carry picks out the input alone — `textbox` under HeroUI, which
 * renders a `type="text"` with `inputmode="numeric"`, and `spinbutton` under shadcn, which
 * renders a real `type="number"`.
 */
const field = (dialog: Locator, label: string) =>
	dialog
		.getByRole('textbox', { name: label, exact: true })
		.or(dialog.getByRole('spinbutton', { name: label, exact: true }))

/** The draft's input for a column, by that column's position in the header row. */
async function draftInput(page: Page, columnId: string): Promise<Locator> {
	const index = await page.evaluate((id) => {
		const headers = [...document.querySelectorAll('[data-slot="thead"] [data-slot="th"]')]
		return headers.findIndex((th) => th.getAttribute('data-column-id') === id)
	}, columnId)
	expect(index, `no header cell with data-column-id="${columnId}"`).toBeGreaterThanOrEqual(0)
	return page.locator(DRAFT_ROW).locator('[data-slot="td"]').nth(index).getByRole('textbox')
}

test.describe("creating.mode: 'row'", () => {
	test.beforeEach(async ({ grid }) => {
		await grid.open(ROW_MODE)
	})

	test('keeps the draft row closed until the trigger is pressed', async ({ page }) => {
		await expect(page.locator(DRAFT_ROW)).toHaveCount(0)

		await addButton(page).click()

		await expect(page.locator(DRAFT_ROW)).toHaveCount(1)
	})

	// A grid whose only row feature is `creating` grows no actions column, so the draft's save
	// and cancel take over the toolbar trigger instead — mounting a column on open would take
	// its width off the `1fr` tracks and jump every column (see `create-trigger.tsx`).
	test('turns the trigger itself into the draft’s save and cancel', async ({ page }) => {
		await addButton(page).click()

		// The draft is in the body, not in a dialog — asserted before the buttons, because a
		// modal would satisfy the three counts below on its own: its overlay `aria-hidden`s the
		// trigger away under shadcn and brings its own Save / Cancel pair.
		await expect(page.locator(DRAFT_ROW)).toHaveCount(1)
		await expect(addButton(page)).toHaveCount(0)
		await expect(saveButton(page)).toHaveCount(1)
		await expect(cancelButton(page)).toHaveCount(1)
	})

	test('save appends the typed row and closes the draft', async ({ grid, page }) => {
		await expect(grid.rows()).toHaveCount(INITIAL_ROWS)

		await addButton(page).click()
		await (await draftInput(page, 'name')).fill(NEW_NAME)
		await saveButton(page).click()

		await expect(grid.rows()).toHaveCount(INITIAL_ROWS + 1)
		await expect(page.locator(DRAFT_ROW)).toHaveCount(0)
		expect(await grid.columnText('name')).toContain(NEW_NAME)
	})

	test('cancel closes the draft and adds nothing', async ({ grid, page }) => {
		await addButton(page).click()
		await (await draftInput(page, 'name')).fill(NEW_NAME)
		await cancelButton(page).click()

		await expect(page.locator(DRAFT_ROW)).toHaveCount(0)
		await expect(grid.rows()).toHaveCount(INITIAL_ROWS)
		expect(await grid.columnText('name')).not.toContain(NEW_NAME)
	})

	test('Escape inside the draft abandons it', async ({ grid, page }) => {
		await addButton(page).click()
		await (await draftInput(page, 'name')).fill(NEW_NAME)
		await page.keyboard.press('Escape')

		await expect(page.locator(DRAFT_ROW)).toHaveCount(0)
		await expect(grid.rows()).toHaveCount(INITIAL_ROWS)
	})

	test('Enter inside the draft commits it', async ({ grid, page }) => {
		await addButton(page).click()
		await (await draftInput(page, 'name')).fill(NEW_NAME)
		await page.keyboard.press('Enter')

		await expect(grid.rows()).toHaveCount(INITIAL_ROWS + 1)
		expect(await grid.columnText('name')).toContain(NEW_NAME)
	})
})

test.describe("creating.mode: 'pin-row'", () => {
	test.beforeEach(async ({ grid }) => {
		await grid.open(PIN_ROW_MODE)
	})

	test('keeps a draft standing at the top of the body, with nothing to open', async ({ grid, page }) => {
		await expect(page.locator(DRAFT_ROW)).toHaveCount(1)
		await expect(addButton(page)).toHaveCount(0)

		// First child of the body, ahead of every data row.
		const draftIsFirst = await page.locator('[data-slot="tbody"]').evaluate((body) => {
			const first = body.querySelector('[data-slot="tr"]')
			return first?.hasAttribute('data-creating-row') ?? false
		})
		expect(draftIsFirst, 'the pinned draft is not the first row in the body').toBe(true)
		// And it is not one of the data rows.
		await expect(grid.rows()).toHaveCount(INITIAL_ROWS)
	})

	// A pinned draft has no closed state to return to, so `canCancel` is false for it and the
	// keyboard is the only way to commit — see `creating-row.tsx`.
	test('offers no cancel, and commits on Enter into a fresh draft', async ({ grid, page }) => {
		await expect(cancelButton(page)).toHaveCount(0)

		await (await draftInput(page, 'name')).fill(NEW_NAME)
		await page.keyboard.press('Enter')

		await expect(grid.rows()).toHaveCount(INITIAL_ROWS + 1)
		expect(await grid.columnText('name')).toContain(NEW_NAME)
		// Still standing, and emptied for the next one.
		await expect(page.locator(DRAFT_ROW)).toHaveCount(1)
		await expect(await draftInput(page, 'name')).toHaveValue('')
	})

	test('Escape leaves the pinned draft standing', async ({ page }) => {
		await (await draftInput(page, 'name')).fill(NEW_NAME)
		await page.keyboard.press('Escape')

		await expect(page.locator(DRAFT_ROW)).toHaveCount(1)
	})
})

test.describe("creating.mode: 'modal'", () => {
	test.beforeEach(async ({ grid }) => {
		await grid.open(MODAL_MODE)
	})

	test('raises a dialog and leaves the body alone', async ({ page }) => {
		await addButton(page).click()

		const dialog = page.getByRole('dialog')
		await expect(dialog).toHaveCount(1)
		await expect(field(dialog, 'Name')).toHaveValue('')
		await expect(page.locator(DRAFT_ROW)).toHaveCount(0)
		// The trigger stays a trigger behind the overlay rather than swapping — the dialog
		// carries its own pair (`create-trigger.tsx`). By `data-slot` and not by role: a Radix
		// dialog `aria-hidden`s everything behind it, so under shadcn the trigger is (correctly)
		// absent from the accessibility tree while the dialog is up.
		await expect(page.locator('[data-slot="create-trigger"]')).toHaveCount(1)
	})

	test('save closes the dialog and appends the row', async ({ grid, page }) => {
		await addButton(page).click()
		const dialog = page.getByRole('dialog')
		await field(dialog, 'Name').fill(NEW_NAME)
		await saveButton(dialog).click()

		await expect(dialog).toHaveCount(0)
		await expect(grid.rows()).toHaveCount(INITIAL_ROWS + 1)
		expect(await grid.columnText('name')).toContain(NEW_NAME)
	})

	test('cancel closes the dialog and adds nothing', async ({ grid, page }) => {
		await addButton(page).click()
		const dialog = page.getByRole('dialog')
		await field(dialog, 'Name').fill(NEW_NAME)
		await cancelButton(dialog).click()

		await expect(dialog).toHaveCount(0)
		await expect(grid.rows()).toHaveCount(INITIAL_ROWS)
	})
})

test.describe('creating.validate', () => {
	test.beforeEach(async ({ grid }) => {
		await grid.open(VALIDATION)
	})

	test('a draft the schema rejects neither closes nor appends', async ({ grid, page }) => {
		await addButton(page).click()
		const dialog = page.getByRole('dialog')
		await field(dialog, 'Name').fill('A')
		await saveButton(dialog).click()

		await expect(dialog).toContainText('must be at least 2 chars')
		await expect(dialog).toHaveCount(1)
		await expect(grid.rows()).toHaveCount(INITIAL_ROWS)
	})

	// The example's checkbox makes `onSave` throw a `ValidationError` carrying both a field
	// error and a form-level one — the second is what the shell's `role="alert"` banner is for.
	test('a rejection from onSave reaches the form as well as the field', async ({ grid, page }) => {
		await page.getByLabel('Simulate server-side rejection').check()
		await addButton(page).click()
		const dialog = page.getByRole('dialog')
		await field(dialog, 'Name').fill(NEW_NAME)
		await field(dialog, 'Email').fill('frank@example.com')
		await field(dialog, 'Age').fill('40')
		await saveButton(dialog).click()

		// Filtered, not `.first()`: each field error is a `role="alert"` of its own, so the
		// form-level banner is picked out by what it says rather than by where it happens to sit.
		await expect(dialog.getByRole('alert').filter({ hasText: 'Could not save' })).toHaveCount(1)
		await expect(dialog).toContainText('email already in use')
		await expect(grid.rows()).toHaveCount(INITIAL_ROWS)
	})

	test('a draft the schema accepts is appended', async ({ grid, page }) => {
		await addButton(page).click()
		const dialog = page.getByRole('dialog')
		await field(dialog, 'Name').fill(NEW_NAME)
		await field(dialog, 'Email').fill('frank@example.com')
		await field(dialog, 'Age').fill('40')
		await saveButton(dialog).click()

		await expect(dialog).toHaveCount(0)
		await expect(grid.rows()).toHaveCount(INITIAL_ROWS + 1)
		expect(await grid.columnText('name')).toContain(NEW_NAME)
	})
})
