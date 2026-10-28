import { expect, test } from '../../../fixtures'

import type { FormFixture } from '../../../fixtures'

/**
 * `withFieldGroup` blocks: an address block placed on a branch (`form-composition-field-group`), a
 * password pair placed through a field map at the root of a sign-up
 * (`form-composition-field-group-validation`), and an address card with its own rules and its own
 * submit placed twice in one form (`form-composition-field-group-address-book`).
 *
 * The pair's inputs are `type='password'`, which carries no ARIA role, so `form.input()` — a
 * `textbox` lookup — cannot reach them. They are addressed as the one `<input>` under the
 * field's `data-field` wrapper instead.
 *
 * A mismatch the user has seen makes the form invalid, and the kit's submit button is disabled
 * while it is, so the blocked sign-up is asserted as a disabled button rather than as a click.
 */
const BASIC = 'form-composition-field-group'
const VALIDATION = 'form-composition-field-group-validation'
const ADDRESS_BOOK = 'form-composition-field-group-address-book'
const VALID = 'correct horse'
const MISMATCH = 'Passwords do not match'
const ADDRESS = { street: 'Main', city: 'Town', zip: '12345' }

const control = (form: FormFixture, path: string) => form.field(path).locator('input')

const fillAddress = async (form: FormFixture, branch: string) => {
	await form.input(`${branch}.street`).fill(ADDRESS.street)
	await form.input(`${branch}.city`).fill(ADDRESS.city)
	await form.input(`${branch}.zip`).fill(ADDRESS.zip)
}

test.describe('withFieldGroup — a block in its own coordinates', () => {
	test('a block placed on a branch writes under it', async ({ form, page }) => {
		await form.open(BASIC)
		await form.input('name').fill('Ann')
		await fillAddress(form, 'address')
		await page.getByRole('button', { name: 'Save contact' }).click()

		expect(await form.submitted()).toEqual({ to: 'saveContact', value: { name: 'Ann', address: ADDRESS } })
	})

	test('a mismatch shows on the real path and blocks sign-up', async ({ form, page }) => {
		await form.open(VALIDATION)
		await form.input('login').fill('ann')
		await control(form, 'password').fill(VALID)
		await control(form, 'confirm').fill('nope')

		await expect(form.field('confirm')).toContainText(MISMATCH)
		await expect(page.getByRole('button', { name: 'Sign up' })).toBeDisabled()
		expect(await form.submitted()).toBeNull()

		await control(form, 'confirm').fill(VALID)
		await page.getByRole('button', { name: 'Sign up' }).click()
		expect(await form.submitted()).toEqual({ to: 'signUp', value: { login: 'ann', password: VALID, confirm: VALID } })
	})
})

test.describe('withFieldGroup — one block placed twice', () => {
	test.beforeEach(async ({ form }) => {
		await form.open(ADDRESS_BOOK)
	})

	test('each placement reports on its own branch', async ({ form }) => {
		await form.input('shipping.zip').fill('12')

		await expect(form.field('shipping.zip')).toContainText('Five digits')
		await expect(form.field('billing.zip')).not.toContainText('Five digits')
	})

	test("each placement's own submit checks and sends its branch alone", async ({ form, page }) => {
		await page.getByRole('button', { name: 'Save billing' }).click()
		await expect(form.field('billing.city')).toContainText('Enter a city')
		expect(await form.submitted()).toBeNull()

		await fillAddress(form, 'shipping')
		await page.getByRole('button', { name: 'Save shipping' }).click()
		expect(await form.submitted()).toEqual({ to: 'saveShipping', value: ADDRESS })
	})

	test("the form's submit holds both placements to the block's rule", async ({ form, page }) => {
		await form.input('email').fill('ann@example.com')
		await fillAddress(form, 'shipping')
		await page.getByRole('button', { name: 'Save customer' }).click()

		await expect(form.field('billing.zip')).toContainText('Five digits')
		expect(await form.submitted()).toBeNull()

		await fillAddress(form, 'billing')
		await page.getByRole('button', { name: 'Save customer' }).click()
		expect(await form.submitted()).toMatchObject({ to: 'saveCustomer', value: { billing: ADDRESS } })
	})
})
