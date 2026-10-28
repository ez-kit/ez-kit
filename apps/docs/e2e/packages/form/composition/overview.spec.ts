import { expect, test, toggle } from '../../../fixtures'

/**
 * The composition overview: one checkout built from all three helpers (`form-composition-checkout`),
 * and the same checkout with the form's schema on `onDynamic` (`form-composition-checkout-rules`).
 */
const CHECKOUT = 'form-composition-checkout'
const CHECKOUT_RULES = 'form-composition-checkout-rules'
const CARD = '1234123412341234'
const CVC = '123'

test.describe('composition overview — one checkout, taken apart', () => {
	test('places an order with no rules to stop it', async ({ form, page }) => {
		await form.open(CHECKOUT)
		await page.getByRole('button', { name: 'Place order' }).click()

		expect(await form.submitted()).toMatchObject({ to: 'placeOrder' })
	})

	test('an empty order reports every part in one pass', async ({ form, page }) => {
		await form.open(CHECKOUT_RULES)
		await page.getByRole('button', { name: 'Place order' }).click()

		await expect(form.field('email')).toContainText('Enter a valid email address')
		await expect(form.field('shipping.street')).toContainText('Enter a street')
		await expect(form.field('payment.card')).toContainText('Sixteen digits')
		expect(await form.submitted()).toBeNull()
	})

	test('billing joins the rules while ticked, and unticking it lets the order go', async ({ form, page }) => {
		await form.open(CHECKOUT_RULES)
		const separate = page.getByRole('checkbox', { name: 'Bill to a different address' })
		await page.getByRole('button', { name: 'Place order' }).click()

		await toggle(separate)
		await form.input('billing.street').fill('Main')
		await expect(form.field('billing.city')).toContainText('Enter a city')
		await toggle(separate)
		await expect(form.field('billing.city')).toHaveCount(0)

		await form.input('email').fill('ann@example.com')
		await form.input('shipping.street').fill('Main')
		await form.input('shipping.city').fill('Town')
		await form.input('shipping.zip').fill('12345')
		await form.input('payment.card').fill(CARD)
		await form.input('payment.cvc').fill(CVC)
		await page.getByRole('button', { name: 'Place order' }).click()

		expect(await form.submitted()).toMatchObject({ to: 'placeOrder', value: { separateBilling: false } })
	})

	test('"Save card" checks and sends the card alone', async ({ form, page }) => {
		await form.open(CHECKOUT_RULES)
		await form.input('payment.card').fill(CARD)
		await form.input('payment.cvc').fill(CVC)
		await page.getByRole('button', { name: 'Save card' }).click()

		expect(await form.submitted()).toEqual({ to: 'saveCard', value: { card: CARD, cvc: CVC } })
	})
})
