import { boxOf, expect, test } from '../../../fixtures'

import type { Locator, Page } from '@playwright/test'

/**
 * Changing an entry's priority in the multi-sort builder — by a step, and by a drag.
 *
 * `sort-toolbar` binds no drag adapter, so its entries carry the step pair; `sort-builder-drag` binds
 * one, so they carry a grip instead. Both start sorted, and the builder's own rows are the record of
 * the sort's order: one `sort-row` per entry, in priority order.
 *
 * `sort-toolbar-single` leaves `multi` unwritten, which is what makes **Add Sort** unavailable once
 * one entry exists.
 */

/*
 * `.first()` on a single row, for the reason the column panel spec records: while a drag is in
 * flight the library keeps a clone of the dragged element beside it, so an id matches twice.
 */
const rowById = (page: Page, columnId: string) =>
	page.locator(`[data-slot="sort-menu"] [data-slot="sort-row"][data-column-id="${columnId}"]`).first()
const handleIn = (row: Locator) => row.locator('[data-slot="sort-drag-handle"]')

/** The builder's entries in priority order, de-duplicated because a drag keeps a clone. */
const sortOrder = async (page: Page): Promise<string[]> => {
	const ids = await page
		.locator('[data-slot="sort-menu"] [data-slot="sort-row"][data-column-id]')
		.evaluateAll((rows) => rows.map((row) => row.getAttribute('data-column-id') ?? ''))
	return [...new Set(ids)]
}

/**
 * Each entry's direction, keyed by its column — what a stray key reaching an entry's direction
 * select would change. Read off that select alone, so the row's position prefix ("Sort by" /
 * "then by"), which a move changes legitimately, is not part of it.
 */
const directions = async (page: Page): Promise<Record<string, string>> => {
	const entries = await page
		.locator('[data-slot="sort-menu"] [data-slot="sort-row"][data-column-id]')
		.evaluateAll((rows): [string, string][] =>
			rows.map((row) => [
				row.getAttribute('data-column-id') ?? '',
				row.querySelector('[aria-label="Sort direction"]')?.textContent.trim() ?? '',
			]),
		)
	return Object.fromEntries(entries)
}

async function openBuilder(page: Page): Promise<void> {
	await page.locator('[data-slot="sort-menu-trigger"]').click()
	await expect(page.locator('[data-slot="sort-menu"] [data-slot="sort-row"]').first()).toBeVisible()
}

/** How long the popover may take to finish animating in on a loaded machine. */
const SETTLE_TIMEOUT_MS = 15_000

/**
 * Wait for the open builder to stop moving. A pointer drag aims at coordinates measured once, and the
 * HeroUI popover animates in: measured mid-animation, the press landed beside the grip and selected
 * the row's text instead of starting a drag. Only the pointer drag needs this.
 */
async function waitForSettledBuilder(page: Page): Promise<void> {
	const firstRow = page.locator('[data-slot="sort-menu"] [data-slot="sort-row"]').first()
	let previous = ''
	await expect
		.poll(
			async () => {
				const box = JSON.stringify(await firstRow.boundingBox())
				const settled = box === previous
				previous = box
				return settled
			},
			{ timeout: SETTLE_TIMEOUT_MS },
		)
		.toBe(true)
}

/**
 * Focus an element and keep asking until the focus sticks — a control inside a react-aria dialog can
 * lose a first `focus()` to its container. `column-panel-keyboard.spec.ts` has the same helper.
 */
async function focus(locator: Locator): Promise<void> {
	await expect
		.poll(async () => {
			await locator.focus()
			return locator.evaluate((element) => element === document.activeElement)
		})
		.toBe(true)
}

/**
 * A real pointer drag down or up the builder's list, in one leg per neighbour crossed — the shape
 * `column-panel-drag.spec.ts` derives and measures for the panel.
 */
async function dragEntryOnto(page: Page, sourceId: string, targetId: string): Promise<void> {
	const order = await sortOrder(page)
	const legs = Math.max(Math.abs(order.indexOf(targetId) - order.indexOf(sourceId)), 1)

	const handle = await boxOf(handleIn(rowById(page, sourceId)))
	const target = await boxOf(rowById(page, targetId))

	const from = { x: handle.x + handle.width / 2, y: handle.y + handle.height / 2 }
	const dy = target.y + target.height / 2 - from.y

	await page.mouse.move(from.x, from.y)
	await page.mouse.down()
	for (let leg = 1; leg <= legs; leg++) {
		await page.mouse.move(from.x, from.y + (dy * leg) / legs, { steps: 6 })
	}
	await page.mouse.up()
}

test.describe('sort builder steps', () => {
	test('a step up raises the entry and the table follows', async ({ grid, page }) => {
		await grid.open('sort-toolbar')
		await openBuilder(page)
		expect(await sortOrder(page)).toEqual(['department', 'salary'])

		await page.getByRole('button', { name: 'Move sort by Salary up' }).click()

		await expect.poll(() => sortOrder(page)).toEqual(['salary', 'department'])
		const salaries = (await grid.columnText('salary')).map((cell) => Number(cell.replace(/\D+/gu, '')))
		expect(salaries).toEqual([...salaries].sort((a, b) => b - a))
	})

	test('a keyboard step keeps focus on the pair, so the next press works', async ({ grid, page }) => {
		await grid.open('sort-toolbar')
		await openBuilder(page)

		// Down to the end: the pressed step is now disabled, so focus lands on its pair.
		await focus(page.getByRole('button', { name: 'Move sort by Department down' }))
		await page.keyboard.press('Enter')
		await expect.poll(() => sortOrder(page)).toEqual(['salary', 'department'])
		await expect(page.getByRole('button', { name: 'Move sort by Department up' })).toBeFocused()

		// The same key again moves it back, without reaching for the mouse.
		await page.keyboard.press('Enter')
		await expect.poll(() => sortOrder(page)).toEqual(['department', 'salary'])
		await expect(page.getByRole('button', { name: 'Move sort by Department down' })).toBeFocused()
	})

	test('the steps stop at either end of the list', async ({ grid, page }) => {
		await grid.open('sort-toolbar')
		await openBuilder(page)

		await expect(page.getByRole('button', { name: 'Move sort by Department up' })).toBeDisabled()
		await expect(page.getByRole('button', { name: 'Move sort by Salary down' })).toBeDisabled()
	})
})

test.describe('sort builder Add Sort', () => {
	test('is unavailable with multi-sort off once an entry exists', async ({ grid, page }) => {
		await grid.open('sort-toolbar-single')
		await openBuilder(page)

		await expect(page.getByRole('button', { name: 'Add Sort' })).toBeDisabled()
	})

	test('stays available with multi-sort on', async ({ grid, page }) => {
		await grid.open('sort-toolbar')
		await openBuilder(page)

		await expect(page.getByRole('button', { name: 'Add Sort' })).toBeEnabled()
	})
})

test.describe('sort builder drag', () => {
	test('Escape cancels a keyboard drag and leaves the builder open', async ({ grid, page }) => {
		await grid.open('sort-builder-drag')
		await openBuilder(page)

		await focus(handleIn(rowById(page, 'department')))
		await page.keyboard.press('Space')
		await expect(page.locator('[data-sort-dragging="true"]').first()).toBeVisible()
		await page.keyboard.press('ArrowDown')
		await page.keyboard.press('Escape')

		await expect(page.locator('[data-sort-dragging]')).toHaveCount(0)
		await expect.poll(() => sortOrder(page)).toEqual(['department', 'salary', 'name'])
		await expect(rowById(page, 'department')).toBeVisible()
	})

	test('a pointer drag moves an entry to where the target stood', async ({ grid, page }) => {
		await grid.open('sort-builder-drag')
		await openBuilder(page)
		expect(await sortOrder(page)).toEqual(['department', 'salary', 'name'])
		await expect(page.getByRole('button', { name: /^Move sort by/ })).toHaveCount(0)

		await waitForSettledBuilder(page)
		await dragEntryOnto(page, 'department', 'salary')

		await expect.poll(() => sortOrder(page)).toEqual(['salary', 'department', 'name'])
	})

	test('a keyboard drag moves an entry exactly one place and changes nothing else', async ({ grid, page }) => {
		await grid.open('sort-builder-drag')
		await openBuilder(page)
		const directionsBefore = await directions(page)
		expect(Object.values(directionsBefore)).toEqual(['Ascending', 'Descending', 'Ascending'])

		await focus(handleIn(rowById(page, 'department')))
		await page.keyboard.press('Space')
		await expect(page.locator('[data-sort-dragging="true"]').first()).toBeVisible()

		// Wait on the optimistic displacement rather than on time: the library queues its move.
		await page.keyboard.press('ArrowDown')
		await expect.poll(() => sortOrder(page)).not.toEqual(['department', 'salary', 'name'])
		await page.keyboard.press('Space')

		await expect.poll(() => sortOrder(page)).toEqual(['salary', 'department', 'name'])
		await expect(page.locator('[data-sort-dragging]')).toHaveCount(0)
		expect(await directions(page)).toEqual(directionsBefore)
	})
})
