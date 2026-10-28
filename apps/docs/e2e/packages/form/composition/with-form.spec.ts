import { expect, test, toggle } from '../../../fixtures'

/**
 * `withForm` parts: a profile cut into two parts (`form-composition-with-form`), the same profile
 * under the form's schema (`form-composition-with-form-validation`), and an order whose delivery
 * part decides which of its fields exist and whose summary part reads the other two
 * (`form-composition-with-form-order`).
 */
const BASIC = 'form-composition-with-form'
const VALIDATION = 'form-composition-with-form-validation'
const ORDER = 'form-composition-with-form-order'

test.describe('withForm — a form cut into parts', () => {
	test('the parts write into one form, and one submit sends it whole', async ({ form, page }) => {
		await form.open(BASIC)
		await form.input('firstName').fill('Ann')
		await form.input('email').fill('ann@example.com')
		await page.getByRole('button', { name: 'Save profile' }).click()

		expect(await form.submitted()).toEqual({
			to: 'saveProfile',
			value: { firstName: 'Ann', lastName: '', email: 'ann@example.com', phone: '' },
		})
	})

	test("the form's schema reports inside every part", async ({ form, page }) => {
		await form.open(VALIDATION)
		await page.getByRole('button', { name: 'Save profile' }).click()

		await expect(form.field('firstName')).toContainText('Enter a first name')
		await expect(form.field('email')).toContainText('Enter a valid email address')
		expect(await form.submitted()).toBeNull()

		await form.input('firstName').fill('Ann')
		await expect(form.field('firstName')).not.toContainText('Enter a first name')
		await expect(form.field('email')).toContainText('Enter a valid email address')
	})

	test('one part decides what another must hold, and the summary reads both', async ({ form, page }) => {
		await form.open(ORDER)
		await page.getByRole('button', { name: 'Place order' }).click()

		await expect(form.field('item')).toContainText('Name the item')
		await expect(form.field('address.street')).toContainText('Enter a street')

		await toggle(page.getByRole('radio', { name: 'Pick up in store' }))
		await expect(form.field('address.street')).toHaveCount(0)
		await form.input('item').fill('Lamp')
		await expect(form.field('store')).toContainText('Pick a store')

		await toggle(page.getByRole('radio', { name: 'Harbour' }))
		await expect(page.getByText('1 × Lamp, pick up at Harbour')).toBeVisible()
		await page.getByRole('button', { name: 'Place order' }).click()

		expect(await form.submitted()).toMatchObject({
			to: 'placeOrder',
			value: { item: 'Lamp', delivery: 'pickup', store: 'harbour' },
		})
	})
})
