import { expect, test } from '@playwright/test'

test('documentation uses an inset surface without obstructing the sidebar', async ({ page }) => {
	await page.goto('/docs/data-grid/getting-started')
	const layout = page.locator('#nd-notebook-layout')
	await expect(layout).toHaveCSS('background-color', 'rgb(245, 245, 245)')
	await expect
		.poll(() => layout.evaluate((element) => getComputedStyle(element, '::before').backgroundColor))
		.toBe('rgb(255, 255, 255)')
	await page.locator('#nd-sidebar').getByRole('link', { name: 'Data Grid', exact: true }).click()
	await expect(page).toHaveURL(/\/docs\/data-grid$/)
})

test('dark examples match the inset surface', async ({ page }) => {
	await page.addInitScript(() => {
		localStorage.setItem('theme', 'dark')
	})
	await page.goto('/docs/data-grid/getting-started')
	const layout = page.locator('#nd-notebook-layout')
	await expect
		.poll(() => layout.evaluate((element) => getComputedStyle(element, '::before').backgroundColor))
		.toBe('rgb(23, 23, 23)')
	const iframe = page.locator('iframe[title="shadcn example: base-plain"]')
	await iframe.scrollIntoViewIfNeeded()
	const frame = page.frameLocator('iframe[title="shadcn example: base-plain"]')
	await expect(frame.getByText('User 1', { exact: true })).toBeVisible()
	await expect(frame.locator('html')).toHaveCSS('background-color', 'rgb(23, 23, 23)')
})
