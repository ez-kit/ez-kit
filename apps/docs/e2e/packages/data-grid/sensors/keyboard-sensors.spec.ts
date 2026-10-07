import { expect, test } from '../../../fixtures'

import type { Locator, Page } from '@playwright/test'

/**
 * Four keyboard consumers in one grid, and the phase's success criterion: **no key handled twice.**
 *
 * Sorting, selection, grid navigation and row dragging all read keys from elements inside the same
 * table. Each one working is covered elsewhere; what is covered here is that they do not take each
 * other's keys — so every case asserts the one thing that changed **and the other three unchanged**.
 *
 * The drag keys are the library's, verified against `@dnd-kit/dom@0.1.21`'s frozen `defaults`
 * (`index.js:1340-1356`) rather than assumed: `start: ['Space','Enter']`, `cancel: ['Escape']`,
 * `end: ['Space','Enter','Tab']`, one key per arrow, and a `shouldActivate` of
 * `event.target === (source.handle ?? source.element)` — i.e. handle-only, enforced by the library.
 *
 * Two kit differences are expressed as such rather than failed on, and neither is a regression:
 * `Alt+Arrow` row reordering does not reach heroui, because React Aria's `Row` forwards no
 * `onKeyDown` (#223); and arrow-key navigation is the package's focus model, which the shadcn kit
 * registers and the heroui kit deliberately does not, React Aria bringing its own.
 */

const EXAMPLE = 'keyboard-sensors'

/** `EMPLOYEE_DATA.slice(0, 8)` in `components/_data.ts`, keyed by `getRowId: (row) => String(row.id)`. */
const INITIAL_ORDER = ['1', '2', '3', '4', '5', '6', '7', '8']

/**
 * Body rows, in render order.
 *
 * While a drag is in flight the drag library keeps a clone of the dragged row in the same `tbody`, so
 * an id appears twice and the list is one longer; every assertion on the order is therefore made after
 * the gesture has ended, as `row-drag.spec.ts` does.
 */
const rowIds = (page: Page): Promise<string[]> =>
	page
		.locator('[data-slot="tbody"] [data-slot="tr"][data-row-id]')
		.evaluateAll((rows) => rows.map((row) => row.getAttribute('data-row-id') ?? ''))

const handleFor = (page: Page, rowId: string) =>
	page.locator(`[data-slot="tbody"] [data-slot="tr"][data-row-id="${rowId}"] [data-slot="row-drag-handle"]`).first()

/**
 * The leaf columns of the `column-drag` example, in the order it declares them.
 *
 * Named rather than derived, for the reason `ordering/column-drag.spec.ts` records: a **group**
 * header carries `data-column-id` too, and the two kits do not render the same header rows — shadcn
 * draws the group row, heroui drops it. Filtering the DOM down to this set reads the same in both.
 */
const LEAF_COLUMNS = ['id', 'name', 'department', 'joinedAt', 'salary']

const columnOrder = async (page: Page): Promise<string[]> => {
	const ids = await page
		.locator('[data-slot="thead"] [data-slot="th"][data-column-id]')
		.evaluateAll((cells) => cells.map((cell) => cell.getAttribute('data-column-id') ?? ''))
	return ids.filter((id) => LEAF_COLUMNS.includes(id))
}

/** `.first()` because a top-level leaf beside column groups renders its header twice in shadcn. */
const columnHandleFor = (page: Page, columnId: string) =>
	page.locator(`[data-slot="th"][data-column-id="${columnId}"] [data-slot="column-drag-handle"]`).first()

/**
 * Whether a drag is in flight, on **either** axis — the axes stamp their own attribute, so a gate
 * watching only the row one waits forever for a column pick-up that has already happened.
 */
const draggingCount = (page: Page) => page.locator('[data-row-dragging="true"], [data-column-dragging="true"]').count()

const selectedCount = (page: Page) => page.locator('[data-slot="tbody"] [data-slot="tr"][aria-selected="true"]').count()

/**
 * Open the example and wait for the drag handles.
 *
 * `grid.open` waits for the table, which is not enough here: the handle is lazy-loaded per kit
 * (`shared/data-grid-dnd/handle.tsx` wraps it in a `Suspense` with a `null` fallback), so a grid can
 * be fully rendered with no handle in it yet. Counting handles in that window reported zero on heroui
 * and nearly cost this spec a fabricated kit difference.
 */
async function open(grid: { open: (id: string) => Promise<void> }, page: Page): Promise<void> {
	await grid.open(EXAMPLE)
	await expect(handleFor(page, '1')).toBeVisible()
	expect(await rowIds(page)).toEqual(INITIAL_ORDER)
}

/**
 * Every sort trigger's direction, header order — the whole sort state as the DOM reports it.
 *
 * Read as a list rather than per column so that "sorting did not happen" is one assertion over every
 * column, which is what the cases about the other three consumers need.
 */
const sortDirections = (page: Page): Promise<string[]> =>
	page
		.locator('[data-slot="sort-trigger"]')
		.evaluateAll((triggers) => triggers.map((trigger) => trigger.getAttribute('data-sort-direction') ?? 'none'))

/**
 * Where the grid's single tab stop is, as a row id and a cell position — the caret, read from the DOM.
 *
 * `tabIndex` rather than `document.activeElement`, and that is the load-bearing choice. The focus model
 * moves one tab stop by writing `tabIndex` imperatively, so the stop **is** the caret's position; while
 * `activeElement` additionally depends on whether anything currently holds focus, and mid-drag it does
 * not — the optimistic displacement remounts the dragged row, focus falls to `<body>`, and a reading
 * taken then says `null` for a caret that has not moved anywhere. Measured: that is exactly what made
 * this case fail while the behaviour under test was correct.
 */
function caret(page: Page): Promise<string | null> {
	return page.evaluate(() => {
		const stop = document.querySelector('[data-slot="td"][tabindex="0"], [data-slot="th"][tabindex="0"]')
		if (stop === null) return null
		const row = stop.closest('[data-slot="tr"]')
		if (row === null) return null
		const cells = [...row.querySelectorAll('[data-slot="td"], [data-slot="th"]')]
		return `${row.getAttribute('data-row-id') ?? 'header'}:${String(cells.indexOf(stop))}`
	})
}

/**
 * Focus a control and keep asking until the focus sticks.
 *
 * Not defensive looping: **heroui needs exactly two calls and shadcn one**, measured. React Aria's
 * `Row` manages focus, so the first `focus()` on a control inside a row (or inside a header cell)
 * lands on the row and the second lands on the control — which means a key sent to the page after one
 * `focus()` is delivered to the `<tr>` on heroui and silently does nothing. That is how this spec
 * first reported "no keyboard drag on heroui", which is false: with the focus confirmed, every
 * keyboard gesture here works identically in both kits.
 *
 * `locator.press` is not the answer either, for the same reason — it focuses once and then types.
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
 * Press a key at the drag handle, which is the only element the keyboard sensor activates on —
 * `shouldActivate` is `event.target === (source.handle ?? source.element)`, so the element the key is
 * delivered to is the whole question.
 */
async function pressHandle(page: Page, rowId: string, key: string): Promise<void> {
	await focusControl(handleFor(page, rowId))
	await page.keyboard.press(key)
}

/**
 * Press a movement key during a drag and wait for the displacement it causes to land in the DOM.
 *
 * The drag library queues its `move()` in a microtask and re-dispatches (`@dnd-kit/dom`'s
 * `sortable.js:373` and `:419`), so the keystroke after an arrow can arrive before the arrow has had
 * any effect — and a drop key that arrives first commits at the position the arrow was meant to leave.
 * Measured: without this wait, `Alt+Arrow` inside a drag committed **no** movement rather than one, so
 * the case read as a failure of the stand-down it was written to check.
 *
 * The signal is the rendered order changing, which is what the optimistic displacement does, rather
 * than a sleep.
 */
async function pressAndSettle(
	page: Page,
	key: string,
	order: (page: Page) => Promise<string[]> = rowIds,
): Promise<void> {
	const before = (await order(page)).join(',')
	await page.keyboard.press(key)
	await expect.poll(async () => (await order(page)).join(',')).not.toBe(before)
}

test.describe('keyboard sensors', () => {
	test('a keyboard drag picks a row up, moves it and drops it — and does nothing else', async ({ grid, page }) => {
		await open(grid, page)
		const sortBefore = await sortDirections(page)

		await pressHandle(page, '1', 'Space')
		await expect.poll(() => draggingCount(page)).toBeGreaterThan(0)

		await pressAndSettle(page, 'ArrowDown')
		await page.keyboard.press('Space')

		// Exactly one place down, and the gesture is over.
		await expect.poll(() => rowIds(page)).toEqual(['2', '1', '3', '4', '5', '6', '7', '8'])
		await expect.poll(() => draggingCount(page)).toBe(0)
		// The other three consumers stood down: nothing sorted, nothing selected.
		expect(await sortDirections(page)).toEqual(sortBefore)
		expect(await selectedCount(page)).toBe(0)
	})

	test('Escape mid-drag cancels and leaves the order untouched', async ({ grid, page }) => {
		await open(grid, page)
		const sortBefore = await sortDirections(page)

		await pressHandle(page, '1', 'Space')
		await expect.poll(() => draggingCount(page)).toBeGreaterThan(0)
		await page.keyboard.press('ArrowDown')
		await page.keyboard.press('Escape')

		await expect.poll(() => draggingCount(page)).toBe(0)
		await expect.poll(() => rowIds(page)).toEqual(INITIAL_ORDER)
		expect(await sortDirections(page)).toEqual(sortBefore)
		expect(await selectedCount(page)).toBe(0)
	})

	/**
	 * The collision the phase is named after: `Alt+ArrowDown` reaches both the row's own reorder
	 * handler (`row.tsx`) and the drag library's `down` key while a keyboard drag is in flight. Both
	 * acting moved the row twice per press.
	 *
	 * shadcn only, and the reason is the reorder half, not the drag half: React Aria's `Row` forwards
	 * no `onKeyDown`, so `Alt+Arrow` never reaches a heroui row at all (#223) and there is no second
	 * actor to collide with. The keyboard drag itself works in both kits — the case above covers that.
	 */
	test('Alt+Arrow during a keyboard drag moves the row exactly once', async ({ grid, page, kit }) => {
		test.skip(
			kit !== 'shadcn',
			"Alt+Arrow row reordering does not reach heroui — React Aria's Row forwards no onKeyDown (#223)",
		)
		await open(grid, page)

		// First the control: with nothing being dragged, the chord is the row's and moves it one place.
		await pressHandle(page, '1', 'Alt+ArrowDown')
		await expect.poll(() => rowIds(page)).toEqual(['2', '1', '3', '4', '5', '6', '7', '8'])

		// Now the same chord inside a drag. One press, one movement — two would be `1` landing two
		// places away, which is what this asserted against before the handler learned to stand down.
		await open(grid, page)
		await pressHandle(page, '1', 'Space')
		await expect.poll(() => draggingCount(page)).toBeGreaterThan(0)
		await pressAndSettle(page, 'Alt+ArrowDown')
		await page.keyboard.press('Space')

		await expect.poll(() => draggingCount(page)).toBe(0)
		await expect.poll(() => rowIds(page)).toEqual(['2', '1', '3', '4', '5', '6', '7', '8'])
	})

	test('sorting with the keyboard starts no drag, and picking up does not sort', async ({ grid, page }) => {
		await open(grid, page)

		const trigger = page.locator('[data-slot="th"][data-column-id="name"] [data-slot="sort-trigger"]')
		await focusControl(trigger)
		await page.keyboard.press('Enter')

		await expect(trigger).toHaveAttribute('data-sort-direction', 'asc')
		expect(await draggingCount(page), 'Enter on the sort trigger must not pick anything up').toBe(0)
		expect(await selectedCount(page)).toBe(0)

		// `Space` is a sort key *and* the drag library's start key. On the trigger it sorts; it is the
		// handle-only `shouldActivate` that keeps it from doing both.
		await page.keyboard.press('Space')
		await expect(trigger).toHaveAttribute('data-sort-direction', 'desc')
		expect(await draggingCount(page)).toBe(0)

		// And the mirror: picking up on the handle leaves the sort exactly where it was.
		const sortBefore = await sortDirections(page)
		await pressHandle(page, '1', 'Space')
		await expect.poll(() => draggingCount(page)).toBeGreaterThan(0)
		expect(await sortDirections(page)).toEqual(sortBefore)
		await page.keyboard.press('Escape')
	})

	/**
	 * Navigation is the package's focus model, which only the shadcn kit registers
	 * (`createDataGrid({ keyboardNavigation: true })`); heroui's table is React Aria's and brings its
	 * own roving manager, so a second one would fight it for the arrows. `a11y/keyboard-navigation.spec.ts`
	 * covers each kit's navigation on its own terms — what is asserted here is only that a drag takes
	 * the arrows away from it and gives them back.
	 */
	test('arrows move the caret, and stand down while a drag is in flight', async ({ grid, page, kit }) => {
		test.skip(kit !== 'shadcn', "heroui brings React Aria's own focus manager, not the package's")
		await open(grid, page)

		const cell = page.locator('[data-slot="tbody"] [data-slot="tr"][data-row-id="1"] [data-slot="td"]').nth(2)
		await cell.evaluate((element: HTMLElement) => {
			element.tabIndex = 0
			element.focus()
		})
		const start = await caret(page)
		expect(start).not.toBeNull()

		// No drag: the arrow is navigation's.
		await page.keyboard.press('ArrowDown')
		await expect.poll(() => caret(page)).not.toBe(start)
		const moved = await caret(page)
		expect(await rowIds(page), 'navigating must not reorder').toEqual(INITIAL_ORDER)

		// Mid-drag: the arrow belongs to the drag layer, and the caret must not follow it.
		await pressHandle(page, '1', 'Space')
		await expect.poll(() => draggingCount(page)).toBeGreaterThan(0)
		/*
		 * The stop is now the handle's own cell rather than where navigation left it, and that is
		 * correct: focusing a control inside a cell makes that cell the tab stop, which is a focus move
		 * and not a navigation one. So the invariant this case is about is measured across the arrow
		 * alone — recorded here rather than asserted against `moved`, which is what it was at first and
		 * was wrong.
		 */
		const atPickup = await caret(page)
		expect(atPickup).not.toBeNull()
		await page.keyboard.press('ArrowDown')
		expect(await caret(page), 'the caret must not move while a drag owns the arrows').toBe(atPickup)
		await page.keyboard.press('Escape')

		await expect.poll(() => draggingCount(page)).toBe(0)
		await expect.poll(() => rowIds(page)).toEqual(INITIAL_ORDER)
		// And the cancelled drag left the caret where the pickup put it.
		expect(await caret(page)).toBe(atPickup)
		expect(moved).not.toBeNull()
	})

	test('selecting a row with the keyboard disturbs neither the order nor the sort', async ({ grid, page }) => {
		await open(grid, page)
		const sortBefore = await sortDirections(page)

		// `Space` on a checkbox is the browser's, not a grid handler — which is the point: the same key
		// starts a drag on the handle one cell away.
		const checkbox = page.locator('[data-slot="tbody"] [data-slot="tr"][data-row-id="1"] [aria-label="Select row"]')
		await focusControl(checkbox)
		await page.keyboard.press('Space')

		await expect.poll(() => selectedCount(page)).toBe(1)
		expect(await draggingCount(page), 'Space on a checkbox must not pick a row up').toBe(0)
		expect(await rowIds(page)).toEqual(INITIAL_ORDER)
		expect(await sortDirections(page)).toEqual(sortBefore)
	})

	/**
	 * A keyboard drag of a **column** — the same sensor, the same handle-only activator and the same
	 * keys as the row case above, on a different surface and through a different drop helper.
	 *
	 * It is here rather than in `ordering/column-drag.spec.ts` because that file drives the header with
	 * a pointer; before this case the column axis' keyboard path had no browser coverage at all. It
	 * opens the `column-drag` example because that is the one with column handles — the grid this file
	 * otherwise drives has a row handle only.
	 */
	test('a keyboard drag of a column commits the new order', async ({ grid, page }) => {
		await grid.open('column-drag')
		const handle = columnHandleFor(page, 'name')
		await expect(handle).toBeVisible()
		expect(await columnOrder(page)).toEqual(LEAF_COLUMNS)

		await focusControl(handle)
		await page.keyboard.press('Space')
		await expect.poll(() => draggingCount(page)).toBeGreaterThan(0)

		await pressAndSettle(page, 'ArrowRight', columnOrder)
		await page.keyboard.press('Space')

		await expect.poll(() => draggingCount(page)).toBe(0)
		// One place along the inline axis: `name` and `department` have traded places and nothing else
		// moved. Logical under RTL, where `ordering/column-drag.spec.ts` covers the pointer gesture.
		await expect.poll(() => columnOrder(page)).toEqual(['id', 'department', 'name', 'joinedAt', 'salary'])
	})

	test('Escape mid-drag leaves the column order untouched', async ({ grid, page }) => {
		await grid.open('column-drag')
		const handle = columnHandleFor(page, 'name')
		await expect(handle).toBeVisible()
		expect(await columnOrder(page)).toEqual(LEAF_COLUMNS)

		await focusControl(handle)
		await page.keyboard.press('Space')
		await expect.poll(() => draggingCount(page)).toBeGreaterThan(0)
		await pressAndSettle(page, 'ArrowRight', columnOrder)
		await page.keyboard.press('Escape')

		await expect.poll(() => draggingCount(page)).toBe(0)
		await expect.poll(() => columnOrder(page)).toEqual(LEAF_COLUMNS)
	})

	/**
	 * RECORDED BEHAVIOUR, not a requirement — the plan leaves both of these open and asks for a
	 * measurement. They are asserted so that a change is noticed rather than silent; if the decision is
	 * to change either, change the case with it.
	 *
	 * `Tab` is one of the library's `end` keys (`end: ['Space','Enter','Tab']`), and the grid's
	 * one-tab-stop model rewrites `tabIndex` on every render knowing nothing about drags. Measured: the
	 * drag **commits** at the position the arrows reached, and the caret stays on the handle — the
	 * tab-stop model does not move it and focus does not escape the grid on shadcn. On heroui focus
	 * leaves the table entirely, which is React Aria's doing rather than the package's.
	 */
	test('RECORDED: Tab mid-drag commits the drag', async ({ grid, page }) => {
		await open(grid, page)

		await pressHandle(page, '1', 'Space')
		await expect.poll(() => draggingCount(page)).toBeGreaterThan(0)
		await pressAndSettle(page, 'ArrowDown')
		await page.keyboard.press('Tab')

		await expect.poll(() => draggingCount(page)).toBe(0)
		await expect.poll(() => rowIds(page)).toEqual(['2', '1', '3', '4', '5', '6', '7', '8'])
	})

	/**
	 * RECORDED BEHAVIOUR, as above, and the more surprising of the two.
	 *
	 * `Enter` on a cell focuses the first focusable element in it (`use-keyboard-navigation.ts:274-283`).
	 * In the drag column that element **is** the handle — so a second `Enter` is delivered to the
	 * handle, which is the library's `start` key, and a drag begins. Two `Enter`s on a cell therefore
	 * pick a row up. Confirmed, shadcn only: it is the package's focus model that moves focus into the
	 * cell, and heroui does not run it, so there a cell's `Enter` focuses nothing and no drag starts.
	 */
	test('RECORDED: two Enters on a drag cell start a drag', async ({ grid, page, kit }) => {
		test.skip(kit !== 'shadcn', "heroui brings React Aria's own focus manager, not the package's")
		await open(grid, page)

		const dragCell = page.locator(
			'[data-slot="tbody"] [data-slot="tr"][data-row-id="1"] [data-slot="td"][data-system-column="drag"]',
		)
		await dragCell.evaluate((element: HTMLElement) => {
			element.tabIndex = 0
			element.focus()
		})

		// First `Enter`: focus enters the cell and lands on the handle. Nothing is dragged yet.
		await page.keyboard.press('Enter')
		await expect(handleFor(page, '1')).toBeFocused()
		expect(await draggingCount(page)).toBe(0)

		// Second `Enter`: the handle has it now, and it is the library's start key.
		await page.keyboard.press('Enter')
		await expect.poll(() => draggingCount(page)).toBeGreaterThan(0)

		await page.keyboard.press('Escape')
		await expect.poll(() => rowIds(page)).toEqual(INITIAL_ORDER)
	})
})
