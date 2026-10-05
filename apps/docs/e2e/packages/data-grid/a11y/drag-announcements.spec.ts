import { boxOf, expect, test } from '../../../fixtures'

import type { Locator, Page } from '@playwright/test'

/**
 * What a screen reader is told during a drag, and the ARIA the handle carries.
 *
 * The drag library's `Accessibility` plugin creates a `role="status" aria-live="polite"` region on
 * **`document.body`** — outside the grid, one per drag-drop manager — plus a hidden instructions node
 * each handle points `aria-describedby` at. Its own sentences are English and name record ids; the
 * grid replaces them from the message catalogue's `ordering` group, so what is asserted here is the
 * **content** of that region at each step of a keyboard drag, against the catalogue's English
 * defaults.
 *
 * Only the keyboard path is narrated, deliberately: a pointer drag is something a sighted user can
 * already see, and announcing every `dragover` would be noise. One case exists to catch that policy
 * silently inverting.
 *
 * **This is not a screen-reader test.** It proves the right text reaches a correctly shaped live
 * region at the right moment. Whether it *reads well* through NVDA or VoiceOver is unverified here.
 */

/**
 * The library's live region.
 *
 * On `document.body` rather than in the grid, so this is page-scoped rather than taken from the `grid`
 * fixture. There is one region per drag-drop manager and therefore one per grid; both example pages
 * this spec drives mount exactly one grid, measured, so `.first()` is unambiguous — a page with two
 * grids would need the region matched to its manager, which nothing in the DOM lets you do.
 */
const region = (page: Page) => page.locator('body > [role="status"][aria-live="polite"]').first()

const rowIds = (page: Page): Promise<string[]> =>
	page
		.locator('[data-slot="tbody"] [data-slot="tr"][data-row-id]')
		.evaluateAll((rows) => rows.map((row) => row.getAttribute('data-row-id') ?? ''))

const columnIds = (page: Page): Promise<string[]> =>
	page
		.locator('[data-slot="thead"] [data-slot="th"][data-column-id]')
		.evaluateAll((cells) => cells.map((cell) => cell.getAttribute('data-column-id') ?? ''))

const rowHandle = (page: Page, rowId: string) =>
	page.locator(`[data-slot="tbody"] [data-slot="tr"][data-row-id="${rowId}"] [data-slot="row-drag-handle"]`).first()

/**
 * Whether a drag is in flight, on either axis.
 *
 * Both attributes, because the axes stamp their own: `data-row-dragging` on the `<tr>` and
 * `data-column-dragging` on the `<th>`. Watching only the row one made the column case wait for a
 * signal that never arrives and fail as though the pick-up had not happened.
 */
const draggingCount = (page: Page) => page.locator('[data-row-dragging="true"], [data-column-dragging="true"]').count()

/**
 * Focus a control and keep asking until the focus sticks — one call on shadcn, two on heroui, measured.
 *
 * React Aria's `Row` manages focus, so the first `focus()` on a control inside a row lands on the row
 * and a key sent afterwards goes to the `<tr>` and does nothing. Established in the sensors spec, where
 * it was the difference between "heroui cannot keyboard-drag" and the truth.
 */
async function focusControl(locator: Locator): Promise<void> {
	await expect
		.poll(async () => {
			await locator.focus()
			return locator.evaluate((element) => element === document.activeElement)
		})
		.toBe(true)
}

/**
 * The region's text, polled.
 *
 * Every assertion here goes through polling because the announcement lands **several hundred
 * milliseconds** after the keystroke — measured at ~400–600 ms for a movement. A read taken straight
 * after the key returns the *previous* sentence, which is how this spec first reported that movements
 * were never announced at all. They are.
 */
function expectAnnouncement(page: Page, text: string) {
	return expect.poll(() => region(page).innerText()).toBe(text)
}

/** A keyboard pick-up at a handle, waiting for the drag to be in flight. */
async function pickUp(page: Page, handle: Locator): Promise<void> {
	await focusControl(handle)
	await page.keyboard.press('Space')
	await expect.poll(() => draggingCount(page)).toBeGreaterThan(0)
}

/**
 * Press a movement key and wait for the displacement to land in the DOM.
 *
 * The drag library queues its `move()` in a microtask and re-dispatches, so a key pressed immediately
 * after an arrow can be handled before the arrow has had any effect.
 */
async function moveAndSettle(page: Page, key: string, order: (page: Page) => Promise<string[]>): Promise<void> {
	const before = (await order(page)).join(',')
	await page.keyboard.press(key)
	await expect.poll(async () => (await order(page)).join(',')).not.toBe(before)
}

test.describe('drag announcements', () => {
	test('a row pick-up is announced by position, and a move reports the new one', async ({ grid, page }) => {
		await grid.open('row-drag')
		await expect(rowHandle(page, '2')).toBeVisible()
		// Nothing is announced before a gesture starts.
		expect(await region(page).innerText()).toBe('')

		await pickUp(page, rowHandle(page, '2'))
		// A row is named by its 1-based position among the rendered rows, never by its id.
		await expectAnnouncement(page, 'Picked up row 2 of 8.')

		await moveAndSettle(page, 'ArrowDown', rowIds)
		await expectAnnouncement(page, 'Moved the row to position 3 of 8.')

		await page.keyboard.press('Escape')
	})

	/**
	 * The drop sentence must name the position the row **landed at**, which is the one hazard in this
	 * phase: the adapter commits before describing, with the commit made idempotent so that neither of
	 * the library's two `dragend` listeners can win a race. If this reports the position the row started
	 * from, that guarantee has broken.
	 */
	test('a row drop is announced at the position it landed at', async ({ grid, page }) => {
		await grid.open('row-drag')
		await expect(rowHandle(page, '2')).toBeVisible()

		await pickUp(page, rowHandle(page, '2'))
		await moveAndSettle(page, 'ArrowDown', rowIds)
		await expectAnnouncement(page, 'Moved the row to position 3 of 8.')

		await page.keyboard.press('Space')
		await expect.poll(() => draggingCount(page)).toBe(0)

		// The row is third now, so that is what the drop has to say.
		await expect.poll(() => rowIds(page)).toEqual(['1', '3', '2', '4', '5', '6', '7', '8'])
		await expectAnnouncement(page, 'Dropped the row at position 3 of 8.')
	})

	test('Escape announces the cancellation and reports the row back where it was', async ({ grid, page }) => {
		await grid.open('row-drag')
		await expect(rowHandle(page, '2')).toBeVisible()

		await pickUp(page, rowHandle(page, '2'))
		await moveAndSettle(page, 'ArrowDown', rowIds)
		await page.keyboard.press('Escape')

		await expect.poll(() => draggingCount(page)).toBe(0)
		await expect.poll(() => rowIds(page)).toEqual(['1', '2', '3', '4', '5', '6', '7', '8'])
		await expectAnnouncement(page, 'Cancelled, the row is back at position 2 of 8.')
	})

	test('a column is announced by its header, and the drop names where it landed', async ({ grid, page }) => {
		await grid.open('column-drag')
		const handle = page.locator('[data-slot="column-drag-handle"]').first()
		await expect(handle).toBeVisible()
		expect(await region(page).innerText()).toBe('')

		await pickUp(page, handle)
		// By header text — `Name` — not by the `name` column id.
		await expectAnnouncement(page, 'Picked up column Name, position 2 of 5.')

		await moveAndSettle(page, 'ArrowRight', columnIds)
		// The sentence is `columnMovedTo({ name, position })`, so the name is the column that moved.
		await expectAnnouncement(page, 'Moved column Name to position 3 of 5.')

		await page.keyboard.press('Space')
		await expect.poll(() => columnIds(page)).toContain('name')
		await expectAnnouncement(page, 'Dropped column Name at position 3 of 5.')
	})

	/**
	 * A pointer drag says nothing, and this is the case that catches the policy inverting.
	 *
	 * Asserted across the whole gesture rather than only at the end: an announcement made on every
	 * `dragover` and cleared on release would pass an after-the-fact check.
	 */
	test('a pointer drag announces nothing', async ({ grid, page }) => {
		await grid.open('row-drag')
		const handle = rowHandle(page, '1')
		await expect(handle).toBeVisible()
		expect(await region(page).innerText()).toBe('')

		const grip = await boxOf(handle)
		const target = await boxOf(page.locator('[data-slot="tbody"] [data-slot="tr"][data-row-id="4"]').first())
		const x = grip.x + grip.width / 2
		const from = grip.y + grip.height / 2
		const to = target.y + target.height / 2

		await page.mouse.move(x, from)
		await page.mouse.down()
		await page.mouse.move(x, from + (to - from) / 2, { steps: 4 })
		await page.mouse.move(x, to, { steps: 4 })
		expect(await region(page).innerText(), 'a pointer drag must stay silent mid-gesture').toBe('')
		await page.mouse.up()

		// The drag really happened — otherwise the silence would prove nothing.
		await expect.poll(() => rowIds(page)).not.toEqual(['1', '2', '3', '4', '5', '6', '7', '8'])
		// And it is still silent once the region has had every chance to speak.
		await page.waitForTimeout(1_000)
		expect(await region(page).innerText(), 'a pointer drag must stay silent after release').toBe('')
	})

	test("the handle's description is the catalogue's instructions, not the library's", async ({ grid, page }) => {
		await grid.open('row-drag')
		const handle = rowHandle(page, '1')
		await expect(handle).toBeVisible()

		const described = await handle.evaluate((element) => {
			const id = element.getAttribute('aria-describedby')
			return id === null ? null : (document.getElementById(id)?.textContent ?? null)
		})

		// The catalogue's `ordering.instructions`. The library's own paragraph begins "To pick up a
		// draggable item, press the space bar." — asserting the whole string is what distinguishes them.
		expect(described).toBe(
			'Press Space to pick this item up, then the arrow keys to move it. Press Space again to drop it, or Escape to cancel.',
		)
	})

	/**
	 * `aria-roledescription` on the handle.
	 *
	 * **This case cannot distinguish what it was written to distinguish, and that is a finding rather
	 * than a gap in the spec.** The catalogue's `ordering.draggable` default is the literal
	 * `'draggable'`, which is character-for-character the library's own default — so an identical
	 * attribute value is consistent with the catalogue being applied *and* with it being ignored.
	 * Measured: both kits carry `draggable`, so the expected kit difference (shadcn forwarding the
	 * catalogue's value, heroui dropping it to the library's) is not observable in the default locale.
	 * Telling them apart needs a grid whose `messages.ordering.draggable` is overridden to something
	 * else; there is no such example, and adding one is a decision for whoever owns this phase.
	 */
	test('the handle carries a role description in both kits', async ({ grid, page }) => {
		await grid.open('row-drag')
		const handle = rowHandle(page, '1')
		await expect(handle).toBeVisible()

		await expect(handle).toHaveAttribute('aria-roledescription', 'draggable')
	})
})
