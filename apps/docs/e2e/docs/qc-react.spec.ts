import { expect, test } from '@playwright/test'

test('connector guide resolves its registered grid previews and API page', async ({ page }) => {
	const response = await page.goto('/docs/qc-react')
	expect(response?.status()).toBe(200)
	await expect(page.getByRole('heading', { level: 1, name: '@ez-kit/qc-react' })).toBeVisible()
	for (const kit of ['shadcn', 'heroui']) {
		if (kit === 'heroui') await page.getByRole('tab', { name: 'HeroUI', exact: true }).first().click()
		for (const id of ['query-source', 'query-modal']) {
			const frame = page.getByTitle(`${kit} example: ${id}`, { exact: true })
			await frame.scrollIntoViewIfNeeded()
			await expect(frame).toHaveAttribute('src', new RegExp(`/examples/${kit}/${id}`))
			await expect(frame.contentFrame().getByRole('table')).toBeVisible()
		}
	}
	await expect(page.getByRole('heading', { name: /Generate fetchers, without hooks/ })).toBeVisible()
	await page.getByRole('link', { name: 'the native source contract' }).click()
	await expect(page.getByRole('heading', { level: 1, name: 'API', exact: true })).toBeVisible()
	await expect(page.getByRole('heading', { level: 2, name: /^Native sources/ })).toBeVisible()
})
