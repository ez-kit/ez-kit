import { expect, test } from '@playwright/test'

test('setup guide puts its complete example after the four connection steps', async ({ page }) => {
	const response = await page.goto('/docs/qc-react')
	expect(response?.status()).toBe(200)
	await expect(page.getByRole('heading', { level: 1, name: 'Connect a DataGrid' })).toBeVisible()
	await expect(page.getByRole('heading', { level: 2, name: /^[1-4]\./ })).toHaveText([
		/^1\. Install the connector/,
		/^2\. Add the Query provider/,
		/^3\. Describe the read/,
		/^4\. Render the connected grid/,
	])
	for (const kit of ['shadcn', 'heroui']) {
		if (kit === 'heroui') {
			await page.getByRole('tab', { name: 'HeroUI', exact: true }).first().click()
			await expect(page).toHaveURL(/\?kit=heroui/)
		}
		const frame = page.getByTitle(`${kit} example: query-start`, { exact: true })
		await expect(async () => {
			await frame.scrollIntoViewIfNeeded({ timeout: 1000 })
			await expect(frame).toHaveAttribute('src', new RegExp(`/examples/${kit}/query-start`), { timeout: 1000 })
			await expect(frame.contentFrame().getByText('Ada', { exact: true })).toBeVisible({ timeout: 1000 })
		}).toPass({ timeout: 15000 })
	}
	await expect(page.getByRole('button', { name: 'Show all', exact: true }).first()).toBeVisible()
})

test('grid CRUD and Orval recipes are reachable from the guide', async ({ page }) => {
	await page.goto('/docs/qc-react')
	test.setTimeout(60_000)
	await expect(page.getByRole('link', { name: 'Add grid CRUD and see how invalidation works' })).toHaveAttribute(
		'href',
		'/docs/qc-react/crud',
	)
	await page.goto('/docs/qc-react/crud')
	await expect(page.getByRole('heading', { name: /Follow the refresh after a save/ })).toBeVisible()
	for (const id of ['query-source', 'query-modal']) {
		const frame = page.getByTitle(`shadcn example: ${id}`, { exact: true })
		await expect(async () => {
			await frame.scrollIntoViewIfNeeded({ timeout: 1000 })
			await expect(frame.contentFrame().getByRole('table')).toBeVisible({ timeout: 1000 })
		}).toPass({ timeout: 15000 })
	}
	await expect(page.getByRole('link', { name: 'Orval recipe' })).toHaveAttribute('href', '/docs/qc-react/orval')
	await page.goto('/docs/qc-react/orval')
	await expect(page.getByRole('heading', { name: /Generate fetchers, without hooks/ })).toBeVisible()
	await expect(page.getByRole('link', { name: 'the native source contract' })).toHaveAttribute(
		'href',
		'/docs/qc-react/api#native-sources',
	)
	await page.goto('/docs/qc-react/api#native-sources')
	await expect(page.getByRole('heading', { level: 2, name: /^Native sources/ })).toBeVisible()
})

test('editing the grid refreshes the same collection in the ordinary list', async ({ page }) => {
	await page.goto('/docs/qc-react/reuse')
	const frame = page.getByTitle('shadcn example: query-shared-source', { exact: true })
	const demo = frame.contentFrame()
	const list = demo.getByRole('region', { name: 'Ordinary list' })
	await expect(async () => {
		await frame.scrollIntoViewIfNeeded({ timeout: 1000 })
		await expect(list.getByText('Ada', { exact: true })).toBeVisible({ timeout: 1000 })
	}).toPass({ timeout: 15000 })

	const grid = demo.getByRole('region', { name: 'Editable grid' })
	await grid.getByRole('row').filter({ hasText: 'Ada' }).getByRole('button', { name: 'Edit', exact: true }).click()
	const dialog = demo.getByRole('dialog')
	await dialog.getByRole('textbox', { name: 'Name', exact: true }).fill('Ada Lovelace')
	await dialog.getByRole('button', { name: 'Save', exact: true }).click()
	await expect(grid.getByText('Ada Lovelace', { exact: true })).toBeVisible()
	await expect(list.getByText('Ada Lovelace', { exact: true })).toBeVisible()
})
