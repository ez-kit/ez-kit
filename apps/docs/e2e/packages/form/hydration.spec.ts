import { expect, test } from '../../fixtures'

/**
 * The one form route rendered through the normal server path (`app/(embed)/ssr/form/<kit>`).
 *
 * Every example page renders client-only (`next/dynamic` with `ssr: false`), so nothing there
 * can show a hydration mismatch. This page prerenders the server-actions example, hydrates it,
 * and submits it to a real server action. React 19 reports a mismatch as a console error, so
 * an empty error list is the assertion — `data-form-id` comes from `useId` and must match, as
 * must every id a kit's UI library generates.
 *
 * The text control is reached by its `id`, the field's name, which both kits put on it.
 *
 * The server HTML alone satisfies a visibility check, and a click before React attaches would
 * submit the form natively — so the spec waits for React's own fiber key on the input before it
 * acts. The example sets `method='post'`, which the page recommends; asserting it on the
 * `<form>` checks that `<Form>` passes it through to the element in both kits.
 */
function isHydrated(id: string): boolean {
	const input = document.getElementById(id)
	return input !== null && Object.keys(input).some((key) => key.startsWith('__reactFiber'))
}

test('the server-rendered form hydrates without errors and submits to a real action', async ({ page, kit }) => {
	const errors: string[] = []
	page.on('pageerror', (error) => errors.push(error.message))
	page.on('console', (message) => {
		if (message.type() === 'error') errors.push(message.text())
	})

	await page.goto(`/ssr/form/${kit}?theme=light`)
	await expect(page.locator('[data-field="username"]')).toBeVisible()
	await expect(page.locator('form')).toHaveAttribute('method', 'post')
	await page.waitForFunction(isHydrated, 'username')

	await page.locator('#username').fill('admin')
	await page.locator('#email').fill('admin@example.com')
	await page.getByRole('button', { name: 'Sign up' }).click()
	await expect(page.locator('[data-field="username"]')).toContainText('That username is taken')
	await expect(page.locator('#username')).toBeFocused()

	expect(errors).toEqual([])
})
