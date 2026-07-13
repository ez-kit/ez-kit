import { expect, test } from '@playwright/test'

test('shadcn example page renders an isolated grid', async ({ page }) => {
	await page.goto('/examples/shadcn/base-sorting?theme=light')
	// The grid table renders (data-slot from the shadcn table blocks).
	await expect(page.locator('table')).toBeVisible()
	// Isolation: docs chrome (Fumadocs sidebar/nav) must NOT be present.
	await expect(page.locator('[data-fumadocs-sidebar], nav[aria-label="Main navigation"]')).toHaveCount(0)
})
