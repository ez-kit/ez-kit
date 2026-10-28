import { expect, test, toggle } from '../../../fixtures'

import type { FormFixture } from '../../../fixtures'

/**
 * `form.FormGroup` branches: a payment branch with its own "Save card" (`form-composition-form-group`),
 * the same branch with its own rules (`form-composition-form-group-validation`), and a settings form
 * with two branches, each saved on its own (`form-composition-form-group-settings`).
 *
 * The password inputs are `type='password'`, which carries no ARIA role, so they are addressed as
 * the one `<input>` under the field's `data-field` wrapper rather than through `form.input()`.
 */
const BASIC = 'form-composition-form-group'
const VALIDATION = 'form-composition-form-group-validation'
const SETTINGS = 'form-composition-form-group-settings'
const CARD = '1234123412341234'
const CVC = '123'
const VALID = 'correct horse'

const control = (form: FormFixture, path: string) => form.field(path).locator('input')

test.describe('form.FormGroup — a branch with its own submit', () => {
	test('"Save card" sends the branch, "Place order" sends everything', async ({ form, page }) => {
		await form.open(BASIC)
		await form.input('email').fill('ann@example.com')
		await form.input('payment.card').fill(CARD)
		await page.getByRole('button', { name: 'Save card' }).click()
		expect(await form.submitted()).toEqual({ to: 'saveCard', value: { card: CARD, cvc: '' } })

		await page.getByRole('button', { name: 'Place order' }).click()
		expect(await form.submitted()).toEqual({
			to: 'placeOrder',
			value: { email: 'ann@example.com', payment: { card: CARD, cvc: '' } },
		})
	})

	test("the branch's rules gate its own submit", async ({ form, page }) => {
		await form.open(VALIDATION)
		await form.input('payment.card').fill('1234')
		await page.getByRole('button', { name: 'Save card' }).click()

		await expect(form.field('payment.card')).toContainText('Sixteen digits')
		expect(await form.submitted()).toBeNull()

		await form.input('payment.card').fill(CARD)
		await form.input('payment.cvc').fill(CVC)
		await page.getByRole('button', { name: 'Save card' }).click()
		expect(await form.submitted()).toEqual({ to: 'saveCard', value: { card: CARD, cvc: CVC } })
	})

	test("the form's submit does not need the branch's submit", async ({ form, page }) => {
		await form.open(VALIDATION)
		await page.getByRole('button', { name: 'Place order' }).click()

		await expect(form.field('email')).toContainText('Enter a valid email address')
		await expect(form.field('payment.card')).toContainText('Sixteen digits')
		expect(await form.submitted()).toBeNull()
	})
})

test.describe('form.FormGroup — two branches, each saved on its own', () => {
	test.beforeEach(async ({ form }) => {
		await form.open(SETTINGS)
	})

	test('"Change password" checks and sends only its branch', async ({ form, page }) => {
		await page.getByRole('button', { name: 'Change password' }).click()
		expect(await form.submitted()).toBeNull()

		await control(form, 'security.password').fill(VALID)
		await control(form, 'security.confirm').fill(VALID)
		await page.getByRole('button', { name: 'Change password' }).click()

		expect(await form.submitted()).toEqual({ to: 'changePassword', value: { password: VALID, confirm: VALID } })
	})

	test("a branch's own rule over the whole branch shows as its error", async ({ form, page }) => {
		await toggle(page.getByRole('checkbox', { name: 'Email me' }))
		await expect(page.getByRole('alert').filter({ hasText: 'Pick at least one channel' })).toBeVisible()

		await page.getByRole('button', { name: 'Save notifications' }).click()
		expect(await form.submitted()).toBeNull()

		await toggle(page.getByRole('checkbox', { name: 'Text me' }))
		await expect(page.getByRole('alert').filter({ hasText: 'Pick at least one channel' })).toHaveCount(0)
		await page.getByRole('button', { name: 'Save notifications' }).click()
		expect(await form.submitted()).toEqual({ to: 'saveNotifications', value: { email: false, sms: true } })
	})

	test('"Save settings" checks every branch through the form\'s schema', async ({ form, page }) => {
		await page.getByRole('button', { name: 'Save settings' }).click()
		expect(await form.submitted()).toBeNull()
		await expect(control(form, 'security.password')).toBeFocused()

		await control(form, 'security.password').fill(VALID)
		await control(form, 'security.confirm').fill(VALID)
		await page.getByRole('button', { name: 'Save settings' }).click()
		expect(await form.submitted()).toMatchObject({ to: 'saveSettings' })
	})
})
