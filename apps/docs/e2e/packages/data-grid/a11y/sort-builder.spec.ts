import AxeBuilder from '@axe-core/playwright'

import { expect, test } from '../../../fixtures'

import type { Page } from '@playwright/test'

/**
 * The open sort builder, with its entries' grips (`sort-builder-drag`, adapter bound) and with their
 * step pairs (`sort-toolbar`, no adapter). Both are icon-only controls named per entry.
 */

async function openBuilder(page: Page): Promise<void> {
	await page.locator('[data-slot="sort-menu-trigger"]').click()
	await expect(page.locator('[data-slot="sort-menu"] [data-slot="sort-row"]').first()).toBeVisible()
}

const violationsIn = async (page: Page) => {
	const result = await new AxeBuilder({ page }).include('[data-slot="sort-menu"]').analyze()
	return result.violations.map((violation) => ({
		id: violation.id,
		nodes: violation.nodes.map((node) => node.target.join(' ')),
	}))
}

test.describe('sort builder accessibility', () => {
	test('the builder with grips has no axe violations', async ({ grid, page }) => {
		await grid.open('sort-builder-drag')
		await openBuilder(page)
		await expect(page.locator('[data-slot="sort-drag-handle"]').first()).toBeVisible()

		expect(await violationsIn(page)).toEqual([])
	})

	test('the builder with steps has no axe violations', async ({ grid, page }) => {
		await grid.open('sort-toolbar')
		await openBuilder(page)
		await expect(page.locator('[data-slot="sort-move-start"]').first()).toBeVisible()

		expect(await violationsIn(page)).toEqual([])
	})
})
