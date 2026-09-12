import { boxOf, expect, test } from '../../../fixtures'

import type { Locator, Page } from '@playwright/test'

/**
 * The `variant: 'panel'` filter panel — one chip per filterable column, and the two regions
 * that can hold the strip of them.
 *
 * The panel is the whole filter UI under this variant: the headers gave their controls up for
 * it. So "the panel is where it should be" is not a cosmetic claim, and the tests below
 * measure it against the region that is supposed to contain it rather than reading
 * `placement` back off an attribute.
 */

/** 8 orders, no pagination; panel in its own strip above the table (the default). */
const ABOVE = 'filter-panel'
/** The full task board — `panel: 'toolbar'`, so the column filters sit beside the search box. */
const IN_TOOLBAR = 'example-task-board'

const PANEL = '[data-slot="filter-panel"]'
const PANEL_CHIP = '[data-slot="filter-panel-chip"]'

/** Exactly one of the eight orders is Acme's. */
const CUSTOMER = 'Acme'
const TOTAL_ORDERS = 8

function panelChip(page: Page, label: string): Locator {
	return page.locator(PANEL_CHIP).filter({ hasText: label })
}

/** Opens a panel chip's popover and returns the dialog holding its control. */
async function openChip(page: Page, label: string): Promise<Locator> {
	await panelChip(page, label).click()
	const dialog = page.getByRole('dialog').filter({ has: page.getByRole('textbox') })
	await expect(dialog).toBeVisible()
	return dialog
}

test.describe('the filter panel', () => {
	test.beforeEach(async ({ grid }) => {
		await grid.open(ABOVE)
	})

	test('offers a chip per filterable column and no header filters', async ({ grid, page }) => {
		await expect(page.locator(PANEL)).toHaveCount(1)
		await expect(page.locator(PANEL_CHIP)).toHaveCount(4)

		// The variant took the controls out of the header — that is what pays for the panel.
		await expect(grid.header('customer').getByRole('button', { name: 'Filter', exact: true })).toHaveCount(0)
	})

	test('an empty chip reads `Any`', async ({ page }) => {
		await expect(panelChip(page, 'Customer').locator('[data-slot="filter-panel-chip-value"]')).toHaveText('Any')
	})

	test('filtering from a chip narrows the rows and the chip reports the value', async ({ grid, page }) => {
		await expect(grid.rows()).toHaveCount(TOTAL_ORDERS)

		const dialog = await openChip(page, 'Customer')
		await dialog.getByRole('textbox').fill(CUSTOMER)
		await page.keyboard.press('Escape')

		await expect(grid.rows()).toHaveCount(1)
		expect(await grid.columnText('customer')).toEqual(['Acme Inc.'])
		await expect(panelChip(page, 'Customer')).toHaveAttribute('data-has-value', 'true')
		await expect(panelChip(page, 'Customer').locator('[data-slot="filter-panel-chip-value"]')).toContainText(CUSTOMER)
	})

	test('the chip X clears its own filter', async ({ grid, page }) => {
		const dialog = await openChip(page, 'Customer')
		await dialog.getByRole('textbox').fill(CUSTOMER)
		await page.keyboard.press('Escape')
		await expect(grid.rows()).toHaveCount(1)

		// `exact`: the chip button and the popover trigger wrapping it both take their accessible
		// name from their contents, so the X's label is a substring of theirs.
		await page.getByRole('button', { name: 'Clear Customer filter', exact: true }).click()

		await expect(grid.rows()).toHaveCount(TOTAL_ORDERS)
		await expect(panelChip(page, 'Customer')).not.toHaveAttribute('data-has-value', /.*/)
	})
})

test.describe('where the panel goes', () => {
	test('its own strip between the toolbar and the table by default', async ({ grid, page }) => {
		await grid.open(ABOVE)

		// Containment is the claim for `toolbar`, so its absence is the claim here — an `above`
		// panel that happened to render inside the toolbar would pass a bare y-measurement.
		await expect(page.locator(`[data-slot="toolbar"] ${PANEL}`)).toHaveCount(0)

		const panel = await boxOf(page.locator(PANEL))
		const table = await boxOf(page.locator('table'))

		expect(panel.y + panel.height).toBeLessThanOrEqual(table.y)
	})

	test("`panel: 'toolbar'` moves it into the toolbar's leading slot", async ({ grid, page }) => {
		await grid.open(IN_TOOLBAR)

		await expect(page.locator(`[data-slot="toolbar"] ${PANEL}`)).toHaveCount(1)

		// …and is laid out there, not merely parented there: the panel sits inside the toolbar's
		// box, on the same row as the search input rather than under it.
		const panel = await boxOf(page.locator(PANEL))
		const toolbar = await boxOf(page.locator('[data-slot="toolbar"]'))
		const search = await boxOf(page.locator('[data-slot="global-filter-input"]'))

		expect(panel.y).toBeGreaterThanOrEqual(toolbar.y)
		expect(panel.y + panel.height).toBeLessThanOrEqual(toolbar.y + toolbar.height)
		expect(panel.x + panel.width).toBeLessThanOrEqual(search.x)
	})
})
