import { expect, test } from '../../../fixtures'

import type { Locator, Page } from '@playwright/test'

/**
 * Repeatable groups, driven through the JSX API (`form.ArrayField`).
 *
 * This is the form package's first browser coverage, and the array is the right place for it:
 * every other field can be proved in jsdom, while an array's central defect cannot. Removing an
 * entry from the middle renumbers its neighbours, and a list keyed by index then hands one
 * entry's *component instance* the next entry's data — the submitted values still look correct,
 * so only a real render, with real controls holding real local state, shows it (P1 variant C in
 * `specs/005-form-array-fields/design.md`). Hence every case here ends at the payload and, where
 * it can, at what the boxes on screen still say.
 *
 * Nothing addresses a kit. Fields are reached by `data-field` — the field's full path, which the
 * react layer stamps and both kits spread — and controls by their accessible name, which is the
 * only thing the two kits' very different buttons agree on (shadcn: an icon with an `aria-label`;
 * HeroUI: a glyph beside an `sr-only` caption).
 */

/** `form-arrays`: one member (Ada), at most four of them, reorderable. */
const EXAMPLE = 'form-arrays'

const MAX_MEMBERS = 4

/** Captions the example gives its controls; the reorder pair takes the package's defaults. */
const ADD = 'Add member'
const REMOVE = 'Remove'
const MOVE_UP = 'Move up'
const MOVE_DOWN = 'Move down'

const SAVE = 'Save'

type Team = { teamName: string; members: { name: string; email: string; role: string }[] }

/** The list's own control, and one entry's — by the name each carries for a screen reader. */
const addButton = (page: Page) => page.getByRole('button', { name: ADD })
const removeButton = (item: Locator) => item.getByRole('button', { name: REMOVE })
const moveUpButton = (item: Locator) => item.getByRole('button', { name: MOVE_UP })
const moveDownButton = (item: Locator) => item.getByRole('button', { name: MOVE_DOWN })

/**
 * The caret, read and written directly.
 *
 * `selectionStart` belongs to the DOM node rather than to React, and it survives the node being
 * re-pointed at another entry's value — which is exactly what makes it a witness for whether the
 * node travelled with its entry. Playwright has no caret API, so both go through the element.
 */
async function caretTo(input: Locator, offset: number): Promise<void> {
	await input.evaluate((element, at) => {
		;(element as HTMLInputElement).setSelectionRange(at, at)
	}, offset)
}

async function caretOf(input: Locator): Promise<number | null> {
	return input.evaluate((element) => (element as HTMLInputElement).selectionStart)
}

test.describe('a list of members', () => {
	test.beforeEach(async ({ form }) => {
		await form.open(EXAMPLE)
	})

	test('starts from the default entry and grows by one', async ({ form, page }) => {
		await expect(form.items('members')).toHaveCount(1)
		await expect(form.input('members[0].name')).toHaveValue('Ada')

		await addButton(page).click()

		await expect(form.items('members')).toHaveCount(2)
		// The appended entry starts from `newItem`, so its boxes are empty rather than absent.
		await expect(form.input('members[1].name')).toHaveValue('')
	})

	test('an added entry submits under its own index of the array path', async ({ form, page }) => {
		await addButton(page).click()
		await form.input('members[1].name').fill('Grace')
		await form.input('members[1].email').fill('grace@example.com')

		await page.getByRole('button', { name: SAVE }).click()

		const saved = (await form.submitted()) as Team
		expect(saved.members).toHaveLength(2)
		expect(saved.members[1]).toEqual({ name: 'Grace', email: 'grace@example.com', role: 'viewer' })
		// The list is nested under its own key, not flattened onto the form.
		expect(saved.teamName).toBe('Platform')
	})

	/**
	 * The case this whole file exists for.
	 *
	 * Three entries with distinct values, the middle one removed. What this catches is P1's
	 * variant A: an entry left addressing a slot that no longer exists, which wrote a phantom
	 * fourth element into the payload and turned a controlled input uncontrolled. The on-screen
	 * values are asserted beside the payload because the two fail separately — a survivor can
	 * show the right text while submitting to the wrong index.
	 *
	 * It does **not** catch variant C, keying by index: these boxes are controlled, so their text
	 * comes from form state and would be right either way. That is the probe below.
	 */
	test('removing the middle entry leaves each survivor its own values', async ({ form, page }) => {
		await addButton(page).click()
		await addButton(page).click()

		await form.input('members[1].name').fill('Borys')
		await form.input('members[1].email').fill('borys@example.com')
		await form.input('members[2].name').fill('Viktor')
		await form.input('members[2].email').fill('viktor@example.com')

		await removeButton(form.item('members', 1)).click()

		await expect(form.items('members')).toHaveCount(2)
		await expect(form.input('members[0].name')).toHaveValue('Ada')
		await expect(form.input('members[1].name')).toHaveValue('Viktor')
		await expect(form.input('members[1].email')).toHaveValue('viktor@example.com')

		await page.getByRole('button', { name: SAVE }).click()

		const saved = (await form.submitted()) as Team
		expect(saved.members.map((member) => member.name)).toEqual(['Ada', 'Viktor'])
		expect(saved.members.map((member) => member.email)).toEqual(['ada@example.com', 'viktor@example.com'])
	})

	/**
	 * P1 variant C, which is the one a submit-level test cannot see.
	 *
	 * Keying the list by index survives every assertion above — the values are controlled, so
	 * they follow the form state whatever DOM node draws them. What does not follow is the state
	 * the *control* keeps for itself: the caret, an open calendar, a searchable select's query.
	 * The caret is the one of those this example can hold, so it stands in for the rest.
	 *
	 * Keyed by `item.key`, removing Borys unmounts Borys's input and leaves Viktoria's own node
	 * in place, caret included. Keyed by index, Borys's node is the one that survives and is
	 * re-pointed at Viktoria — carrying his caret, or resetting it to the end of her name. The
	 * positions below are chosen so that neither of those is `3`.
	 */
	test("removing an entry does not move a survivor's caret onto another entry's control", async ({ form, page }) => {
		await addButton(page).click()
		await addButton(page).click()
		await form.input('members[1].name').fill('Borys')
		await form.input('members[2].name').fill('Viktoria')

		await caretTo(form.input('members[1].name'), 2)
		await caretTo(form.input('members[2].name'), 3)

		await removeButton(form.item('members', 1)).click()

		await expect(form.input('members[1].name')).toHaveValue('Viktoria')
		expect(await caretOf(form.input('members[1].name'))).toBe(3)
	})

	test('moving an entry up moves both what is shown and what is submitted', async ({ form, page }) => {
		await addButton(page).click()
		await form.input('members[1].name').fill('Grace')
		await form.input('members[1].email').fill('grace@example.com')

		await moveUpButton(form.item('members', 1)).click()

		await expect(form.input('members[0].name')).toHaveValue('Grace')
		await expect(form.input('members[1].name')).toHaveValue('Ada')

		await page.getByRole('button', { name: SAVE }).click()

		const saved = (await form.submitted()) as Team
		expect(saved.members.map((member) => member.name)).toEqual(['Grace', 'Ada'])
	})

	/**
	 * An impossible move is disabled, not removed — the contract's `onMoveUp` / `onMoveDown` are
	 * `undefined` both when reordering is off and when *this* move cannot be made, and the kits
	 * tell the two apart by whether the other handler is there. A row whose controls appeared and
	 * disappeared as it travelled would be worse than one whose arrow greys out, so the test is
	 * that the button is still there.
	 */
	test('the move an entry cannot make is disabled rather than missing', async ({ form, page }) => {
		await addButton(page).click()
		await addButton(page).click()

		const first = form.item('members', 0)
		const middle = form.item('members', 1)
		const last = form.item('members', 2)

		await expect(moveUpButton(first)).toBeDisabled()
		await expect(moveDownButton(first)).toBeEnabled()

		await expect(moveUpButton(middle)).toBeEnabled()
		await expect(moveDownButton(middle)).toBeEnabled()

		await expect(moveUpButton(last)).toBeEnabled()
		await expect(moveDownButton(last)).toBeDisabled()
	})

	test('reaching the upper bound disables the add control instead of hiding it', async ({ form, page }) => {
		while ((await form.items('members').count()) < MAX_MEMBERS) {
			await addButton(page).click()
		}

		await expect(form.items('members')).toHaveCount(MAX_MEMBERS)
		await expect(addButton(page)).toHaveCount(1)
		await expect(addButton(page)).toBeDisabled()
	})
})
