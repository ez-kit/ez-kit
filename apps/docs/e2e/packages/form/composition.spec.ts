import { expect, test } from '../../fixtures'

import type { FormFixture } from '../../fixtures'

/**
 * The two composition examples (`form-composition`, `form-composition-sign-up`): one
 * `PasswordPair` block, placed by path inside a `form.FormGroup` with a submit of its own, and
 * placed through a field map at the root of a sign-up form.
 *
 * The block's inputs are `type='password'`, which carries no ARIA role, so `form.input()` — a
 * `textbox` lookup — cannot reach them. They are addressed as the one `<input>` under the
 * field's `data-field` wrapper instead, which is the same contract the fixture relies on.
 *
 * A mismatch the user has seen makes the form invalid, and the kit's submit button is disabled
 * while it is, so the blocked sign-up is asserted as a disabled button rather than as a click.
 */
const PROFILE = 'form-composition'
const SIGN_UP = 'form-composition-sign-up'
const VALID = 'correct horse'
const MISMATCH = 'Passwords do not match'

const control = (form: FormFixture, path: string) => form.field(path).locator('input')

test.describe('composition — a branch with its own submit', () => {
	test.beforeEach(async ({ form }) => {
		await form.open(PROFILE)
	})

	test('"Change password" checks and sends only the branch', async ({ form, page }) => {
		await page.getByRole('button', { name: 'Change password' }).click()
		expect(await form.submitted()).toBeNull()

		await control(form, 'security.password').fill(VALID)
		await control(form, 'security.confirm').fill(VALID)
		await page.getByRole('button', { name: 'Change password' }).click()

		expect(await form.submitted()).toEqual({ to: 'changePassword', value: { password: VALID, confirm: VALID } })
	})

	test('"Save profile" runs the block too', async ({ form, page }) => {
		await page.getByRole('button', { name: 'Save profile' }).click()
		expect(await form.submitted()).toBeNull()
		await expect(control(form, 'security.password')).toBeFocused()
	})
})

test.describe('composition — a block placed through a field map', () => {
	test('a mismatch shows on the real path and blocks sign-up', async ({ form, page }) => {
		await form.open(SIGN_UP)
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
