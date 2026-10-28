import { expect, test, toggle } from '../../fixtures'

/**
 * The step-flow examples (`form-steps`, `form-steps-conditional`, `form-steps-free`): "Next" checks
 * the step on screen, a step skipped by `when` is passed over and left out of what is sent, and the
 * free mode jumps without a check while "Next" still checks.
 *
 * A move runs an async check, so every assertion on the step on screen waits for the field of the
 * step it expects rather than reading the stepper at once.
 */
const BASIC = 'form-steps'
const CONDITIONAL = 'form-steps-conditional'
const FREE = 'form-steps-free'
const EMAIL = 'ann@example.com'
const CARD = '1234123412341234'

test.describe('steps — the basic flow', () => {
	test('"Next" stays on an invalid step and moves on once it is valid', async ({ form, page }) => {
		await form.open(BASIC)

		await page.getByRole('button', { name: 'Next', exact: true }).click()
		await expect(form.field('email')).toContainText('Enter a valid email address')
		await expect(form.input('name')).toHaveCount(0)

		await form.input('email').fill(EMAIL)
		await page.getByRole('button', { name: 'Next', exact: true }).click()
		await expect(form.input('name')).toBeVisible()
	})

	test('the last step submits the whole form', async ({ form, page }) => {
		await form.open(BASIC)
		await form.input('email').fill(EMAIL)
		await page.getByRole('button', { name: 'Next', exact: true }).click()
		await form.input('name').fill('Ann')
		await page.getByRole('button', { name: 'Next', exact: true }).click()
		await toggle(page.getByRole('checkbox', { name: 'I accept the terms' }))

		await page.getByRole('button', { name: 'Sign up', exact: true }).click()

		expect(await form.submitted()).toEqual({ to: 'signUp', value: { email: EMAIL, name: 'Ann', agree: true } })
	})
})

test.describe('steps — a step that applies only sometimes', () => {
	test('a person skips the company step, and the company is left out of what is sent', async ({ form, page }) => {
		await form.open(CONDITIONAL)
		await toggle(page.getByRole('radio', { name: 'A company' }))
		await form.input('email').fill(EMAIL)
		await page.getByRole('button', { name: 'Next', exact: true }).click()
		await form.input('company.name').fill('Acme')
		await page.getByRole('button', { name: 'Back', exact: true }).click()
		await toggle(page.getByRole('radio', { name: 'A person' }))

		await page.getByRole('button', { name: 'Next', exact: true }).click()
		await form.input('card').fill(CARD)
		await page.getByRole('button', { name: 'Register', exact: true }).click()

		expect(await form.submitted()).toEqual({ to: 'register', value: { email: EMAIL, type: 'person', card: CARD } })
	})
})

test.describe('steps — free navigation', () => {
	test('the stepper jumps without a check, and "Next" still checks', async ({ form, page }) => {
		await form.open(FREE)

		await page.getByRole('button', { name: 'Confirm', exact: true }).click()
		await expect(page.getByRole('checkbox', { name: 'I accept the terms' })).toBeVisible()

		await page.getByRole('button', { name: 'Account', exact: true }).click()
		await page.getByRole('button', { name: 'Next', exact: true }).click()
		await expect(form.field('email')).toContainText('Enter a valid email address')
		await expect(form.input('name')).toHaveCount(0)
	})
})
