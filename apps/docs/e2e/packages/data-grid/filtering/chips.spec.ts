import { boxOf, expect, test } from '../../../fixtures'

import type { Locator, Page } from '@playwright/test'

/**
 * The active-filters strip: what it lists, what removing a chip does, and which side of the
 * table it lands on.
 *
 * Both examples run the **popover** variant, where the strip earns its space — the controls
 * hide behind a header icon, so the chips are the only readable account of what is filtered.
 * That also makes the strip the only way to tell the two positions apart on screen, which is
 * what the layout tests below measure.
 */

/** 50 users, 10 per page; chips above, Clear-all in the toolbar, global search on. */
const ABOVE = 'filter-chips-auto'
/** The same grid with `chips: 'below'`. */
const BELOW = 'filter-chips-below'

/** `User 42` is one row out of the fifty — a filter either applied or it did not. */
const NEEDLE = 'User 42'

const STRIP = '[data-slot="active-filters-bar"]'
/**
 * A chip is addressed by `data-chip-kind`, not by `data-slot="filter-chip"`: HeroUI's `Chip`
 * stamps its own `data-slot="chip"` after the caller's props, so the slot name never survives
 * in that kit (its `styles.css` says as much, and hooks its own draft styling off the mark
 * attribute for the same reason). `data-chip-kind` reaches the DOM intact in both kits and
 * says what the element is anyway.
 */
const CHIP = '[data-chip-kind]'

/**
 * Opens a column's filter popover and returns its dialog.
 *
 * The trigger is addressed by role and accessible name (`messages.filtering.trigger`), not by
 * markup: shadcn renders a `<button>` carrying an sr-only label, HeroUI a React Aria
 * `role='button'` div around an `aria-label`led `<span>`. The two share no element, no tag and
 * no class — the name a screen reader reads out is the whole overlap.
 */
async function openFilter(page: Page, header: Locator): Promise<Locator> {
	await header.getByRole('button', { name: 'Filter', exact: true }).click()
	const dialog = page.getByRole('dialog').filter({ has: page.getByRole('textbox') })
	await expect(dialog).toBeVisible()
	return dialog
}

/** Types into a column's filter and closes the popover again. */
async function filterColumn(page: Page, header: Locator, value: string): Promise<void> {
	const dialog = await openFilter(page, header)
	await dialog.getByRole('textbox').fill(value)
	await page.keyboard.press('Escape')
	await expect(dialog).toBeHidden()
}

/**
 * The global search box. The slot is on the wrapper in both kits — shadcn's icon-positioning
 * div, HeroUI's `SearchField` — so the field itself is reached by its role.
 */
function globalSearch(page: Page): Locator {
	return page.locator('[data-slot="global-filter-input"]').getByRole('searchbox')
}

function chip(page: Page, kind: 'column' | 'global'): Locator {
	return page.locator(`[data-chip-kind="${kind}"]`)
}

test.describe('the chips strip', () => {
	test.beforeEach(async ({ grid }) => {
		await grid.open(ABOVE)
	})

	test('stays unmounted while nothing is filtered', async ({ page }) => {
		await expect(page.locator(STRIP)).toHaveCount(0)
	})

	test('a column filter narrows the rows and raises a chip naming it', async ({ grid, page }) => {
		await expect(grid.rows()).toHaveCount(10)

		await filterColumn(page, grid.header('name'), NEEDLE)

		await expect(grid.rows()).toHaveCount(1)
		expect(await grid.columnText('name')).toEqual([NEEDLE])
		await expect(chip(page, 'column')).toHaveCount(1)
		await expect(chip(page, 'column')).toContainText('Name')
		await expect(chip(page, 'column')).toContainText(NEEDLE)
	})

	test('removing the chip puts the rows back', async ({ grid, page }) => {
		await filterColumn(page, grid.header('name'), NEEDLE)
		await expect(grid.rows()).toHaveCount(1)

		await page.getByRole('button', { name: 'Remove Name filter' }).click()

		await expect(grid.rows()).toHaveCount(10)
		await expect(page.locator(STRIP)).toHaveCount(0)
	})

	test('the global search term gets a chip of its own', async ({ page }) => {
		await globalSearch(page).fill(NEEDLE)

		await expect(chip(page, 'global')).toHaveCount(1)
		await expect(chip(page, 'global')).toContainText(NEEDLE)
		await expect(chip(page, 'column')).toHaveCount(0)
	})

	test('Clear-all empties the strip whatever raised the chips', async ({ grid, page }) => {
		await filterColumn(page, grid.header('name'), NEEDLE)
		await globalSearch(page).fill(NEEDLE)
		await expect(page.locator(CHIP)).toHaveCount(2)

		await page.locator('[data-slot="clear-filters-button"]').click()

		await expect(page.locator(STRIP)).toHaveCount(0)
		await expect(grid.rows()).toHaveCount(10)
	})
})

/**
 * Where the strip lands, measured rather than read off `data-chip-position`: the attribute is
 * what jsdom already checks, and an attribute that no kit lays out would still pass there.
 *
 * Each case asserts both sides of the comparison — the strip above *and* below the table edge
 * it is supposed to clear — so a strip that failed to render (box `null`, which `boxOf`
 * rejects) or one that collapsed onto the table cannot satisfy either.
 */
test.describe('the strip position', () => {
	test('above the table by default', async ({ grid, page }) => {
		await grid.open(ABOVE)
		await filterColumn(page, grid.header('name'), NEEDLE)

		const strip = await boxOf(page.locator(STRIP))
		const table = await boxOf(page.locator('table'))

		expect(strip.y + strip.height).toBeLessThanOrEqual(table.y)
	})

	test("`chips: 'below'` puts it under the table", async ({ grid, page }) => {
		await grid.open(BELOW)
		await filterColumn(page, grid.header('name'), NEEDLE)

		const strip = await boxOf(page.locator(STRIP))
		const table = await boxOf(page.locator('table'))

		expect(strip.y).toBeGreaterThanOrEqual(table.y + table.height)
	})
})
