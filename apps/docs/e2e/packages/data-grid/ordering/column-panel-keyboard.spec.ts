import { expect, test } from '../../../fixtures'

import type { Locator, Page } from '@playwright/test'

/**
 * Dragging a column in the **column panel** with the keyboard — the case where a panel built on a
 * react-aria collection and the drag read the same keys.
 *
 * The HeroUI kit's panel is a `GridList`, which moves focus between rows on an arrow and toggles a
 * row's selection — the column's visibility — on `Space`. A keyboard drag picks up, steps and drops
 * on those same keys. Without `useColumnDragKeyboardGuard` on the collection both acted: one
 * `ArrowDown` moved the row two places, and with the collection's navigation switched to `tab`
 * instead, the `Space` that dropped the row also hid a column. So every case asserts the one move
 * **and** that the visible set of columns did not change.
 *
 * The shadcn kit's panel is a list of plain elements and needs no guard; it runs the drag case all
 * the same, as the reference the collection has to match.
 */

const EXAMPLE = 'column-panel-drag'

/** The leaf columns, in the order `column-panel-drag.tsx` declares them. `joinedAt` starts hidden. */
const PANEL_COLUMNS = ['id', 'name', 'department', 'joinedAt', 'salary']

const rowById = (page: Page, columnId: string) =>
	page.locator(`[data-slot="column-visibility-item"][data-column-id="${columnId}"]`).first()
const handleIn = (row: Locator) => row.locator('[data-slot="column-drag-handle"]')

/** The panel's own order, de-duplicated because the drag keeps a clone of the moving row. */
const panelOrder = async (page: Page): Promise<string[]> => {
	const ids = await page
		.locator('[data-slot="column-visibility-item"][data-column-id]')
		.evaluateAll((rows) => rows.map((row) => row.getAttribute('data-column-id') ?? ''))
	return [...new Set(ids)]
}

/** The visible columns, as a set: what a stray `Space` toggling a row's selection would change. */
const visibleColumns = async (page: Page): Promise<string[]> =>
	(
		await page
			.locator('[data-slot="thead"] [data-slot="th"][data-column-id]')
			.evaluateAll((cells) => cells.map((cell) => cell.getAttribute('data-column-id') ?? ''))
	).sort()

async function openPanel(page: Page): Promise<void> {
	await page.locator('[data-slot="column-visibility-trigger"]').click()
	await expect(rowById(page, 'name')).toBeVisible()
}

/**
 * Focus an element and keep asking until the focus sticks. A react-aria row manages focus, so the
 * first `focus()` on a control inside it can land on the row — `keyboard-sensors.spec.ts` has the
 * measurement behind the same helper there.
 */
async function focus(locator: Locator): Promise<void> {
	await expect
		.poll(async () => {
			await locator.focus()
			return locator.evaluate((element) => element === document.activeElement)
		})
		.toBe(true)
}

test.describe('column panel keyboard drag', () => {
	test('one arrow moves the row one place, and dropping it toggles nothing', async ({ grid, page }) => {
		await grid.open(EXAMPLE)
		await openPanel(page)
		const visibleBefore = await visibleColumns(page)

		await focus(handleIn(rowById(page, 'name')))
		await page.keyboard.press('Space')
		await expect(page.locator('[data-column-dragging="true"]').first()).toBeVisible()

		// Wait on the optimistic displacement rather than on time: the library queues its move.
		await page.keyboard.press('ArrowDown')
		await expect.poll(() => panelOrder(page)).not.toEqual(PANEL_COLUMNS)
		await page.keyboard.press('Space')

		await expect.poll(() => panelOrder(page)).toEqual(['id', 'department', 'name', 'joinedAt', 'salary'])
		await expect(page.getByTestId('column-panel-drag-commits')).toHaveText('1')
		expect(await visibleColumns(page)).toEqual(visibleBefore)
	})

	/**
	 * The guard has to stand aside when nothing is being dragged, or the panel loses the collection's
	 * own keyboard model. Only the HeroUI panel is a collection; the shadcn rows are not focus stops.
	 */
	test('arrows move focus between rows when nothing is being dragged', async ({ grid, page, kit }) => {
		test.skip(kit !== 'heroui', 'only the HeroUI panel is a react-aria collection with row navigation')
		await grid.open(EXAMPLE)
		await openPanel(page)

		await focus(rowById(page, 'name'))
		await page.keyboard.press('ArrowDown')

		await expect
			.poll(() => page.evaluate(() => document.activeElement?.getAttribute('data-column-id')))
			.toBe('department')
	})

	/**
	 * The whole gesture from the keyboard alone, with no programmatic focus: the collection is one tab
	 * stop, the arrows walk its rows, and `ArrowRight` steps into a row's controls, the grip first.
	 */
	test('reaches the grip with the keyboard alone and drags from it', async ({ grid, page, kit }) => {
		test.skip(kit !== 'heroui', 'only the HeroUI panel is a react-aria collection with row navigation')
		await grid.open(EXAMPLE)
		await openPanel(page)

		await page.keyboard.press('Tab')
		await page.keyboard.press('ArrowDown')
		await page.keyboard.press('ArrowRight')
		await expect(handleIn(rowById(page, 'name'))).toBeFocused()

		await page.keyboard.press('Space')
		await expect(page.locator('[data-column-dragging="true"]').first()).toBeVisible()
		await page.keyboard.press('ArrowDown')
		await expect.poll(() => panelOrder(page)).not.toEqual(PANEL_COLUMNS)
		await page.keyboard.press('Space')

		await expect.poll(() => panelOrder(page)).toEqual(['id', 'department', 'name', 'joinedAt', 'salary'])
		await expect(page.getByTestId('column-panel-drag-commits')).toHaveText('1')
		// The drop hands focus back to the grip it started from.
		await expect(handleIn(rowById(page, 'name'))).toBeFocused()
	})

	/**
	 * A collection with multiple selection clears it on `Escape` by default, and the panel's selection
	 * is the columns' visibility: before the panel disallowed an empty selection, this key hid every
	 * column and left the panel open.
	 */
	test('Escape closes the panel and hides nothing', async ({ grid, page, kit }) => {
		test.skip(kit !== 'heroui', 'only the HeroUI panel is a react-aria collection with a selection')
		await grid.open(EXAMPLE)
		const visibleBefore = await visibleColumns(page)
		await openPanel(page)

		await page.keyboard.press('Tab')
		await page.keyboard.press('Escape')

		await expect(page.locator('[data-slot="column-visibility-item"]')).toHaveCount(0)
		expect(await visibleColumns(page)).toEqual(visibleBefore)
	})
})
