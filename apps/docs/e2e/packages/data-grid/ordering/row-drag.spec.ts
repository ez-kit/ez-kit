import { boxOf, expect, test } from '../../../fixtures'

import type { Locator, Page } from '@playwright/test'

/**
 * Dragging a row by its handle.
 *
 * The fourth affordance over the same ordering state the menu entries and `Alt+Arrow` drive, and
 * the first that needs a real pointer: the displacement during a drag is a transform the drag
 * library applies, and the commit happens once, on release. Neither is observable in jsdom, which
 * reports every element as zero-sized — so this is the only place the gesture is exercised.
 *
 * Written against `data-*` attributes and run once per kit by the project matrix, like every other
 * spec here.
 */

const EXAMPLE = 'row-drag'

/** `EMPLOYEE_DATA` in `components/_data.ts`, keyed by `getRowId: (row) => String(row.id)`. */
const INITIAL_ORDER = ['1', '2', '3', '4', '5', '6', '7', '8']

const rowOrder = (page: Page): Promise<string[]> =>
	page
		.locator('[data-slot="tbody"] [data-slot="tr"][data-row-id]')
		.evaluateAll((rows) => rows.map((row) => row.getAttribute('data-row-id') ?? ''))

/*
 * `.first()`, and not as a shrug: while a drag is in flight the drag library keeps a clone of the
 * dragged row **inside the same `tbody`**, so the id matches twice and Playwright refuses an
 * ambiguous locator under strict mode. Scoping to the body is not enough; the clone lives there
 * too. Both carry the same state, so the first is the right one to read.
 */
const rowById = (page: Page, rowId: string) =>
	page.locator(`[data-slot="tbody"] [data-slot="tr"][data-row-id="${rowId}"]`).first()
const handleIn = (row: Locator) => row.locator('[data-slot="row-drag-handle"]')

/**
 * A real pointer drag, in the shape the resizing spec established.
 *
 * `page.mouse` rather than `dragTo`: the repo uses none, and a synthesized drag event does not
 * drive a pointer sensor. The move is taken in steps because a browser starts a drag only once the
 * pointer has actually travelled — a single jump is dropped.
 */
async function dragRowOnto(page: Page, sourceId: string, targetId: string, midDrag?: () => Promise<void>) {
	const handle = await boxOf(handleIn(rowById(page, sourceId)))
	const target = await boxOf(rowById(page, targetId))

	const from = { x: handle.x + handle.width / 2, y: handle.y + handle.height / 2 }
	const to = { x: from.x, y: target.y + target.height / 2 }

	await page.mouse.move(from.x, from.y)
	await page.mouse.down()
	await page.mouse.move(from.x, from.y + (to.y - from.y) / 2, { steps: 4 })
	await page.mouse.move(to.x, to.y, { steps: 4 })
	if (midDrag) await midDrag()
	await page.mouse.up()
}

test.describe('row drag', () => {
	test('moves a row several places and commits exactly once', async ({ grid, page }) => {
		await grid.open(EXAMPLE)
		expect(await rowOrder(page)).toEqual(INITIAL_ORDER)

		await dragRowOnto(page, '1', '4')

		// The row landed where it was dropped, and the rest closed up behind it.
		await expect.poll(() => rowOrder(page)).toEqual(['2', '3', '4', '1', '5', '6', '7', '8'])
		// One gesture, one commit — the whole point of committing on release rather than per frame.
		await expect(page.getByTestId('row-drag-commits')).toHaveText('1')
	})

	test('marks the dragged row and commits nothing until release', async ({ grid, page }) => {
		await grid.open(EXAMPLE)

		await dragRowOnto(page, '1', '4', async () => {
			await expect(rowById(page, '1')).toHaveAttribute('data-row-dragging', 'true')
			/*
			 * The **state** is what stays untouched until release — not the markup. The drag library
			 * displaces the rows optimistically as the pointer moves, so the DOM order has already
			 * changed here and a row id appears twice (the original and its clone). Asserting the DOM
			 * order mid-drag would be asserting the library's animation, which is its business; the
			 * grid's promise is that nothing is committed until the pointer comes up.
			 */
			await expect(page.getByTestId('row-drag-commits')).toHaveText('0')
		})

		// And exactly one commit once it does.
		await expect(page.getByTestId('row-drag-commits')).toHaveText('1')
	})

	test('Escape cancels the drag and writes nothing', async ({ grid, page }) => {
		await grid.open(EXAMPLE)

		const handle = await boxOf(handleIn(rowById(page, '1')))
		const target = await boxOf(rowById(page, '4'))
		const x = handle.x + handle.width / 2
		const y = handle.y + handle.height / 2

		await page.mouse.move(x, y)
		await page.mouse.down()
		await page.mouse.move(x, y + (target.y - y) / 2, { steps: 4 })
		await page.mouse.move(x, target.y + target.height / 2, { steps: 4 })
		await page.keyboard.press('Escape')
		await page.mouse.up()

		await expect.poll(() => rowOrder(page)).toEqual(INITIAL_ORDER)
		await expect(page.getByTestId('row-drag-commits')).toHaveText('0')
	})

	test('every row offers a handle', async ({ grid, page }) => {
		await grid.open(EXAMPLE)

		// Named from the message catalogue, so the assertion is on the accessible name rather than
		// on a glyph each kit draws differently.
		await expect(page.getByRole('button', { name: 'Reorder row' })).toHaveCount(INITIAL_ORDER.length)
	})
})
