import { expect, test } from '@playwright/test'

test('landing demos update data and switch implementations', async ({ page }) => {
	await page.goto('/')
	await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

	for (const kit of ['shadcn', 'heroui'] as const) {
		if (kit === 'heroui') await page.getByRole('button', { name: 'HeroUI' }).click()
		const frame = page.frameLocator(`iframe[title="${kit} example: landing-grid"]`)
		const firstRow = frame.locator('tbody tr').first()
		await expect(firstRow).toContainText('NVDA')
		const initialText = await firstRow.innerText()
		const trend = firstRow.locator('svg[aria-label="Recent simulated price trend"] polyline')
		const initialPoints = await trend.getAttribute('points')
		await expect.poll(() => firstRow.innerText(), { timeout: 10_000 }).not.toBe(initialText)
		await expect.poll(() => trend.getAttribute('points'), { timeout: 10_000 }).not.toBe(initialPoints)
	}

	await page.locator('iframe[title="shadcn example: form-landing"]').scrollIntoViewIfNeeded()
	const jsx = page.frameLocator('iframe[title="shadcn example: form-landing"]')
	await expect(jsx.getByLabel('Project name')).toBeVisible()
	await page.getByRole('button', { name: 'JSON schema' }).click()
	const schema = page.frameLocator('iframe[title="shadcn example: form-landing-schema"]')
	await expect(schema.getByLabel('Project name')).toBeVisible()
	await expect(schema.getByLabel('Team members')).toBeVisible()
	await expect(page.locator('pre').filter({ hasText: '"options"' })).toContainText('Business')
})

test('landing examples use a readable dark surface', async ({ page }) => {
	await page.addInitScript(() => {
		localStorage.setItem('theme', 'dark')
	})
	await page.goto('/')
	const grid = page.frameLocator('iframe[title="shadcn example: landing-grid"]')
	await expect(grid.getByText('NVDA')).toBeVisible()
	await expect(grid.locator('html')).toHaveCSS('background-color', 'rgb(9, 9, 11)')

	await page.locator('iframe[title="shadcn example: form-landing"]').scrollIntoViewIfNeeded()
	const form = page.frameLocator('iframe[title="shadcn example: form-landing"]')
	await expect(form.getByLabel('Project name')).toBeVisible()
	await expect(form.locator('html')).toHaveCSS('background-color', 'rgb(9, 9, 11)')
})
