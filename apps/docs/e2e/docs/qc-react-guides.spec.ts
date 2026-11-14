import { expect, test } from '@playwright/test'

for (const kit of ['shadcn', 'heroui']) {
	for (const mode of ['pagination', 'infinite']) {
		test(`${kit}: ${mode} guide has an independent interactive example`, async ({ page }) => {
			await page.goto(`/docs/qc-react/${mode}?kit=${kit}`)
			const id = mode === 'pagination' ? 'query-pages' : 'query-infinite'
			const frame = page.getByTitle(`${kit} example: ${id}`, { exact: true })
			// Hydration replaces the Suspense fallback iframe with the live preview.
			await expect(async () => {
				await expect(frame).toHaveCount(1, { timeout: 1000 })
				await frame.scrollIntoViewIfNeeded({ timeout: 1000 })
				await expect(frame.contentFrame().getByText('Ada', { exact: true })).toBeVisible({ timeout: 1000 })
			}).toPass({ timeout: 15000 })
			const demo = frame.contentFrame()
			await expect(demo.getByText('Ada', { exact: true })).toBeVisible()
			await expect(demo.getByLabel('Pagination mode')).toHaveCount(0)
			if (mode === 'pagination') {
				await demo.getByRole('button', { name: 'Next', exact: true }).click()
				await expect(demo.getByText('Dorothy', { exact: true })).toBeVisible()
				await expect(demo.getByText('Ada', { exact: true })).toHaveCount(0)
			} else {
				await demo.getByRole('button', { name: /load more/i }).click()
				await expect(demo.getByText('Dorothy', { exact: true })).toBeVisible()
				await expect(demo.getByText('Ada', { exact: true })).toBeVisible()
			}
			await demo.getByRole('searchbox', { name: /search/i }).fill('Grace')
			await expect(demo.getByText('Grace', { exact: true })).toBeVisible()
			await expect(demo.getByText('Dorothy', { exact: true })).toHaveCount(0)
		})
	}
}
