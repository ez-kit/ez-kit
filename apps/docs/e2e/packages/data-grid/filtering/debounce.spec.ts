import { expect, test } from '../../../fixtures'

import type { Page } from '@playwright/test'

const OPEN_DRAFT = '[data-slot="action-bar"][data-state="open"]'

/** The production example simulates a server read with a 550 ms timer, rather than HTTP. */
async function countSimulatedReads(page: Page) {
	await page.addInitScript(() => {
		Reflect.set(window, '__gridFilterReads', 0)
		const original = window.setTimeout.bind(window)
		window.setTimeout = ((handler: TimerHandler, timeout?: number, ...args: unknown[]) => {
			if (timeout === 550)
				Reflect.set(window, '__gridFilterReads', Number(Reflect.get(window, '__gridFilterReads')) + 1)
			return original(handler, timeout, ...args)
		}) as typeof window.setTimeout
	})
}

const reads = (page: Page) => page.evaluate(() => Number(Reflect.get(window, '__gridFilterReads')))

test.describe('scalar filter commit timing', () => {
	test('Apply sends the newest search once, without a delayed second draft', async ({ grid, page }) => {
		await countSimulatedReads(page)
		await grid.open('production-deferred-apply')
		await expect(grid.rows().first()).toBeVisible()
		const reference = (await grid.columnText('reference'))[0]
		if (!reference) throw new Error('Expected an initial order')
		const baseline = await reads(page)
		expect(baseline).toBeGreaterThan(0)
		const search = page.locator('[data-slot="global-filter-input"]').getByRole('searchbox')
		await search.pressSequentially(reference, { delay: 5 })
		await search.press('Enter')
		expect(await reads(page)).toBe(baseline)
		await page.locator(OPEN_DRAFT).getByRole('button', { name: 'Apply', exact: true }).click()
		await expect(grid.rows()).toHaveCount(1)
		expect(await grid.columnText('reference')).toEqual([reference])
		// The interval spans both the old input debounce and the simulated read.
		await page.waitForTimeout(900)
		expect(await reads(page)).toBe(baseline + 1)
		await expect(page.locator('[data-slot="action-bar"][data-state="open"]')).toHaveCount(0)
	})

	test('Apply sends a typed single number through the real kit editor', async ({ grid, page }) => {
		await countSimulatedReads(page)
		await grid.open('production-deferred-apply')
		await expect(grid.rows().first()).toBeVisible()
		const baseline = await reads(page)
		await grid.header('total').getByRole('button', { name: 'Filter', exact: true }).click()
		const input = page.getByLabel('Filter Total, $…', { exact: true })
		await input.pressSequentially('40', { delay: 5 })
		await page.keyboard.press('Escape')
		await page.locator(OPEN_DRAFT).getByRole('button', { name: 'Apply', exact: true }).click()
		await expect(async () => {
			const totals = await grid.columnText('total')
			expect(totals.length).toBeGreaterThan(0)
			expect(totals.every((total) => total.replace(/[^\d.-]/g, '') === '40')).toBe(true)
		}).toPass()
		await page.waitForTimeout(900)
		expect(await reads(page)).toBe(baseline + 1)
		await expect(page.locator(OPEN_DRAFT)).toHaveCount(0)
	})

	test('Reset discards current typing and Apply sends the next search once', async ({ grid, page }) => {
		await countSimulatedReads(page)
		await grid.open('production-deferred-apply')
		await expect(grid.rows().first()).toBeVisible()
		const reference = (await grid.columnText('reference'))[0]
		if (!reference) throw new Error('Expected an initial order')
		const baseline = await reads(page)
		const search = page.locator('[data-slot="global-filter-input"]').getByRole('searchbox')
		await search.fill('discard this search')
		await page.locator(OPEN_DRAFT).getByRole('button', { name: 'Reset', exact: true }).click()
		await expect(search).toHaveValue('')
		await page.waitForTimeout(500)
		expect(await reads(page)).toBe(baseline)
		await search.pressSequentially(reference, { delay: 5 })
		await page.locator(OPEN_DRAFT).getByRole('button', { name: 'Apply', exact: true }).click()
		await expect(grid.rows()).toHaveCount(1)
		expect(await grid.columnText('reference')).toEqual([reference])
		await page.waitForTimeout(900)
		expect(await reads(page)).toBe(baseline + 1)
		await expect(page.locator(OPEN_DRAFT)).toHaveCount(0)
	})

	test('clear cancels a newer pending search in ordinary mode', async ({ grid, page }) => {
		await grid.open('filter-chips-auto')
		const search = page.locator('[data-slot="global-filter-input"]').getByRole('searchbox')
		await search.fill('User 4')
		await expect(page.locator('[data-chip-kind="global"]')).toContainText('User 4')
		await search.fill('User 42')
		await page.locator('[data-slot="toolbar"] [data-slot="clear-filter-button"]').click()
		await expect(search).toHaveValue('')
		await page.waitForTimeout(500)
		await expect(search).toHaveValue('')
		await expect(page.locator('[data-chip-kind="global"]')).toHaveCount(0)
		await expect(grid.rows()).toHaveCount(10)
	})
})
