import { expect, test } from '@playwright/test'

test.describe('Data-Grid docs section', () => {
	test('landing page responds with 200 and renders an h1', async ({ page }) => {
		const response = await page.goto('/docs/data-grid')
		expect(response?.status()).toBeLessThan(400)
		await expect(page.locator('h1')).toBeVisible()
	})

	test('getting-started page renders the flavor toggle', async ({ page }) => {
		await page.goto('/docs/data-grid/getting-started')
		await expect(page.locator('h1')).toContainText(/getting started/i)
		// Each embedded example carries its own switcher, and this page embeds two — so the
		// assertion is about one toggle being present and complete, not about how many.
		const flavors = page.getByRole('tablist', { name: /flavor/i }).first()
		await expect(flavors).toBeVisible()
		await expect(flavors.getByRole('tab', { name: /shadcn/i })).toBeVisible()
		await expect(flavors.getByRole('tab', { name: /heroui/i })).toBeVisible()
	})

	test('sidebar lists the Data Grid section', async ({ page }) => {
		await page.goto('/docs/data-grid')
		const sidebarLinks = page.locator('aside a, nav a').filter({ hasText: /data grid/i })
		await expect(sidebarLinks.first()).toBeVisible()
	})
})
