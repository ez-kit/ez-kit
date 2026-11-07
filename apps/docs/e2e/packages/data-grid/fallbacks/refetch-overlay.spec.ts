import { expect, test } from '../../../fixtures'

const OVERLAY = '[data-slot="refetch-overlay-inner"]'

for (const virtualized of [false, true]) {
	test(`pagination retains rows under the ${virtualized ? 'virtualized' : 'regular'} refetch overlay`, async ({
		grid,
		page,
	}) => {
		await grid.open(virtualized ? 'fallbacks-pagination-virtualized' : 'fallbacks-pagination')
		await expect(grid.rows().first()).toContainText('User 1')
		if (virtualized) {
			await grid.scrollBy({ x: 0, y: 1600 })
			await expect.poll(() => grid.rows().first().getAttribute('data-row-id')).not.toBe('1')
		}
		const previousId = await grid.rows().first().getAttribute('data-row-id')
		await page.getByRole('button', { name: 'Next', exact: true }).click()
		const overlay = page.locator(OVERLAY)
		await expect(overlay).toBeVisible()
		await expect(overlay).not.toHaveCSS('background-color', 'rgba(0, 0, 0, 0)')
		await expect(grid.rows().first()).toHaveAttribute('data-row-id', previousId ?? '')
		await expect(page.locator('[data-loading-row]')).toHaveCount(0)

		if (virtualized) {
			// The spinner belongs to the visible viewport, even after a long vertical scroll.
			const [box, wrapper, header] = await Promise.all([
				overlay.boundingBox(),
				page.locator('[data-slot="table-wrapper"]').boundingBox(),
				page.locator('[data-slot="thead"]').boundingBox(),
			])
			if (!box || !wrapper || !header) throw new Error('Missing virtual overlay geometry')
			expect(Math.abs(box.y - (header.y + header.height))).toBeLessThan(4)
			expect(Math.abs(box.y + box.height - (wrapper.y + wrapper.height))).toBeLessThan(4)
			expect(Math.abs(box.x + box.width / 2 - (wrapper.x + wrapper.width / 2))).toBeLessThan(4)
			await expect(overlay.locator('[aria-label]')).toBeInViewport()
		}

		await expect(overlay).toHaveCount(0)
		await expect(grid.rows().first()).not.toHaveAttribute('data-row-id', previousId ?? '')
		const ids = await grid.rows().evaluateAll((rows) => rows.map((row) => Number(row.getAttribute('data-row-id'))))
		const pageSize = virtualized ? 100 : 5
		expect(ids.length).toBeGreaterThan(0)
		expect(ids.every((id) => id > pageSize && id <= pageSize * 2)).toBe(true)
	})
}
