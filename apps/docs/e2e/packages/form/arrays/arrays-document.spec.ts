import { expect, test } from '../../../fixtures'

import type { Locator, Page } from '@playwright/test'

/**
 * The same list declared as a document (`FormRenderer`), which adds two things the JSX example
 * cannot show: a condition addressed **relative to the entry** (`./kind`), and a cross-entry rule
 * that reports its issues against a path of its own (`[1].email`).
 *
 * Both are per-entry questions, so both are really the same question this suite exists to ask —
 * does an entry keep to itself? A condition that leaked would show a field on the wrong row; a
 * rule whose path did not resolve would put its message on the list, or on entry one.
 */

/** `form-arrays-schema`: `attendees` (one entry) and an empty `waitlist`, from one field set. */
const EXAMPLE = 'form-arrays-schema'

const ADD_ATTENDEE = 'Add attendee'
const ADD_WAITLIST = 'Add to waitlist'
const BOOK = 'Book'

type Attendee = { name: string; email: string; kind: string; company: string }
type Booking = { eventName: string; attendees: Attendee[]; waitlist: Attendee[] }

/**
 * Picks an option the way a person does.
 *
 * The trigger is reached as the entry field's `button` rather than by role: shadcn's is a Radix
 * `combobox`, HeroUI's a button with `aria-haspopup="listbox"`, and a select field renders no
 * other button. The options themselves are a listbox in both, so the role serves there.
 */
async function choose(page: Page, field: Locator, option: string): Promise<void> {
	await field.locator('button').first().click()
	await page.getByRole('option', { name: option, exact: true }).click()
}

test.describe('a document with two lists', () => {
	test.beforeEach(async ({ form }) => {
		await form.open(EXAMPLE)
	})

	test('gives each list its own entries and its own add control', async ({ form, page }) => {
		await expect(form.items('attendees')).toHaveCount(1)
		await expect(form.items('waitlist')).toHaveCount(0)

		await page.getByRole('button', { name: ADD_WAITLIST }).click()

		// One field set, two lists: the waitlist grew and the attendees did not.
		await expect(form.items('waitlist')).toHaveCount(1)
		await expect(form.items('attendees')).toHaveCount(1)
		await expect(form.input('waitlist[0].name')).toHaveValue('')
	})

	test('a `./` condition inside one entry leaves its neighbours alone', async ({ form, page }) => {
		await page.getByRole('button', { name: ADD_ATTENDEE }).click()

		// `company` is declared `when: { field: './kind', eq: 'company' }`, and no entry is a
		// company yet, so neither row draws it.
		await expect(form.field('attendees[0].company')).toHaveCount(0)
		await expect(form.field('attendees[1].company')).toHaveCount(0)

		await choose(page, form.field('attendees[1].kind'), 'Company')

		await expect(form.field('attendees[1].company')).toBeVisible()
		// The condition resolved against *this* entry's `kind`, not the form's first one.
		await expect(form.field('attendees[0].company')).toHaveCount(0)
	})

	test('a value typed into the revealed field submits under that entry alone', async ({ form, page }) => {
		await page.getByRole('button', { name: ADD_ATTENDEE }).click()
		await form.input('attendees[1].name').fill('Grace')
		await form.input('attendees[1].email').fill('grace@example.com')
		await choose(page, form.field('attendees[1].kind'), 'Company')
		await form.input('attendees[1].company').fill('Ada Ltd')

		await page.getByRole('button', { name: BOOK }).click()

		const saved = (await form.submitted()) as Booking
		expect(saved.attendees[1]).toEqual({
			name: 'Grace',
			email: 'grace@example.com',
			kind: 'company',
			company: 'Ada Ltd',
		})
		// The first entry's `company` is hidden, and a hidden field is stripped from the payload
		// (see `schema.mdx`) — so this is the stripping happening *per entry*, against the
		// visibility computed for that entry, while the second entry keeps its value.
		expect(saved.attendees[0]).not.toHaveProperty('company')
		expect(saved.waitlist).toEqual([])
	})

	/**
	 * The `unique-emails` rule receives the whole array and returns `{ path: '[1].email' }` —
	 * relative to the list. The assertion is therefore *where* the message lands: on the second
	 * entry's email field, and nowhere on the first.
	 */
	test('a cross-entry rule puts its message on the entry it blames', async ({ form, page }) => {
		await page.getByRole('button', { name: ADD_ATTENDEE }).click()
		await form.input('attendees[1].name').fill('Grace')
		await form.input('attendees[1].email').fill('ada@example.com')
		// The message is gated on the field being touched, as every field's is.
		await form.input('attendees[1].email').blur()

		await expect(form.field('attendees[1].email')).toContainText('Already used by attendee 1')
		await expect(form.field('attendees[0].email')).not.toContainText('Already used')
	})
})
