import { expect, test } from '../../../fixtures'

for (const dismiss of ['success', 'close', 'escape', 'backdrop'] as const) {
	test(`connected save: ${dismiss}`, async ({ page, grid }) => {
		await grid.open('query-modal')
		await expect(page.getByText('Ada', { exact: true })).toBeVisible()
		await page.getByLabel('Fail the next refresh').check()
		await page.getByRole('button', { name: 'Edit', exact: true }).click()
		const dialog = page.getByRole('dialog')
		await dialog.getByRole('textbox', { name: 'Name', exact: true }).fill('Grace')
		await dialog.getByRole('button', { name: 'Save', exact: true }).click()
		await expect(dialog.getByRole('button', { name: 'Save', exact: true })).toBeDisabled()
		await expect(dialog.getByRole('button', { name: 'Cancel', exact: true })).toBeDisabled()
		if (dismiss === 'close') await dialog.getByRole('button', { name: /close/i }).click()
		if (dismiss === 'escape') await page.keyboard.press('Escape')
		if (dismiss === 'backdrop') await page.mouse.click(5, 5)
		await expect(dialog).toHaveCount(0)
		await expect(page.getByText('Refreshing users…', { exact: true })).toBeVisible()
		await expect(page.getByText('Ada', { exact: true })).toBeVisible()
		await expect(page.getByText('Refresh failed; saved changes remain on the server.', { exact: true })).toBeVisible({
			timeout: 10000,
		})
		await expect(dialog).toHaveCount(0)
		await expect(page.getByText('Ada', { exact: true })).toBeVisible()
	})
}
