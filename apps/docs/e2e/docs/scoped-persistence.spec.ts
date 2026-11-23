import { expect, test } from '@playwright/test'

test('automatic restore times out, preserves resize after late response and resets the scope', async ({ page }) => {
	const errors: string[] = []
	page.on('pageerror', (error) => errors.push(error.message))
	await page.goto('/docs/zu-store/persist/cache')
	const server = page.getByRole('region', { name: 'Server layout' })
	await expect(server.getByRole('status')).toContainText('pending')
	await expect(server.getByRole('status')).toContainText('timeout', { timeout: 6000 })
	await expect(page.getByTestId('saved-server-width')).toHaveText('Stored server width: 720')
	await page.getByRole('button', { name: 'Set server width to 500' }).click()
	await expect(page.getByTestId('saved-server-width')).toHaveText('Stored server width: 500')
	await page.getByRole('button', { name: 'Deliver server read' }).click()
	await expect(server.getByRole('slider')).toHaveValue('500')
	await expect(page.getByTestId('saved-server-width')).toHaveText('Stored server width: 500')
	await page.getByRole('button', { name: 'Set browser width to 500' }).click()
	await page.reload()
	await expect(page.getByRole('region', { name: 'Browser layout' }).getByRole('slider')).toHaveValue('500')
	await page.getByRole('button', { name: 'Reset page layout' }).click()
	await expect(server.getByRole('slider')).toHaveValue('320')
	await expect(page.getByTestId('saved-server-width')).toHaveText('Stored server width: default')
	await expect(page.getByRole('region', { name: 'Browser layout' }).getByRole('slider')).toHaveValue('320')
	expect(errors).toEqual([])
})
