import { expect, test } from '@playwright/test'

const packages = [
	{ name: 'Data Grid', href: '/docs/data-grid' },
	{ name: 'Form', href: '/docs/form' },
	{ name: 'zu-store', href: '/docs/zu-store' },
	{ name: 'va-store', href: '/docs/va-store' },
	{ name: 'twc', href: '/docs/twc' },
] as const

test('package navigation is present on the landing page and documentation', async ({ page }) => {
	for (const path of ['/', '/docs/data-grid/getting-started']) {
		await page.goto(path)
		const header = page.locator('header').first()
		for (const item of packages) {
			await expect(header.getByRole('link', { name: item.name, exact: true })).toHaveAttribute('href', item.href)
			await expect(header.getByRole('link', { name: item.name, exact: true })).toBeVisible()
		}
		if (path.startsWith('/docs')) {
			await expect(header.getByRole('link', { name: 'Data Grid', exact: true })).toHaveAttribute('data-active', 'true')
			await expect(page.locator('#nd-sidebar')).toBeVisible()
			await expect(page.locator('#nd-sidebar > div:first-child > button[aria-haspopup="dialog"]')).toBeHidden()
			const lastPackage = await header.getByRole('link', { name: 'twc', exact: true }).boundingBox()
			const search = await header.locator('button[data-search-full]').boundingBox()
			expect(lastPackage).not.toBeNull()
			expect(search).not.toBeNull()
			if (!lastPackage || !search) throw new Error('Package navigation or search is not visible')
			expect(lastPackage.x + lastPackage.width).toBeLessThan(search.x)
		}
	}
})

test('package navigation remains available on mobile', async ({ page }) => {
	await page.setViewportSize({ width: 390, height: 844 })
	await page.goto('/')
	await page.getByRole('button', { name: 'Toggle Menu' }).click()
	await expect(page.getByRole('link', { name: 'Form', exact: true })).toBeVisible()

	await page.goto('/docs/data-grid/getting-started')
	await page.locator('#nd-subnav').getByRole('button', { name: 'Open Sidebar' }).click()
	await expect(page.getByRole('link', { name: 'Form', exact: true })).toBeVisible()
	await expect(page.locator('#nd-sidebar-mobile > div:first-child > button[aria-haspopup="dialog"]')).toBeHidden()
	await page.getByRole('link', { name: 'Form', exact: true }).click()
	await expect(page).toHaveURL(/\/docs\/form$/)
	await page.locator('#nd-subnav').getByRole('button', { name: 'Open Sidebar' }).click()
	await expect(page.locator('#nd-sidebar-mobile').getByRole('link', { name: 'Basic concepts' })).toBeVisible()
})
