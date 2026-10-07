import { boxOf, expect, test } from '../../../fixtures'

import type { Locator, Page } from '@playwright/test'

/**
 * Dragging a row in a **virtualized** grid.
 *
 * `row-drag.spec.ts` covers the gesture itself over eight rows that are all mounted at once. This
 * one covers what a window adds: ten thousand rows, a few dozen of them in the DOM, and an index
 * space that changes size and membership while the pointer is still down. A row that leaves the
 * window mid-gesture is the case that used to land the dragged row at position 0 rather than at the
 * drop target — so every assertion here is on the **landing position**, never merely on the row
 * having moved.
 *
 * The example is uncontrolled (`ordering={{ row: true }}`): the grid keeps the order and renders it,
 * so the DOM after release is the committed state. There is no commit counter to read, which is why
 * the cancel case asserts the order rather than a count.
 *
 * Written against `data-*` attributes and run once per kit by the project matrix, like every other
 * spec here.
 */

const EXAMPLE = 'virtualized-row-drag'

/** `id: i + 1` over 10 000 rows, keyed by `getRowId: (row) => String(row.id)`. */
const INITIAL_HEAD = ['1', '2', '3', '4', '5', '6']

/** Row height in the example (`estimateSize: 49`), the unit every scroll offset below is built from. */
const ROW_HEIGHT = 49
/**
 * Far enough that the window shares no row with the one the drag started in — several window-fulls,
 * where one window is ~29 rows (the ~8 visible plus `overscan: 10` on each side).
 *
 * **Not the PRD's row 400, and that is a measurement rather than a shortcut.** Only the library's own
 * auto-scroll produces a drop at all (see the case's docblock), and it runs at ~700 px/s under shadcn
 * and ~400 px/s under heroui — so row 400 means ~28 s and ~49 s of holding the pointer, and the heroui
 * half does not fit a sane timeout. The mechanism under test is the window turning over mid-gesture,
 * and that is complete well before row 100.
 */
const FAR_ROW_INDEX = 100
const FAR_SCROLL_TOP = FAR_ROW_INDEX * ROW_HEIGHT
/**
 * The committed index a far landing must be past, so that "it landed where it was dropped" is not
 * satisfied by a row that merely drifted. A window is ~29 rows, so one window's slack below the far
 * region puts this comfortably clear of the top of the list — which is where both of the defects this
 * spec is about used to put the row.
 */
const FAR_REGION_FLOOR = FAR_ROW_INDEX - 30
/**
 * How far the displacement case auto-scrolls before it looks at the neighbours: forty rows, which is
 * more than a window (~29 rows) — so every row mounted when the drag started has been unmounted and
 * every row on screen was mounted mid-gesture — and short enough to cost a few seconds rather than the
 * far cases' dozen.
 */
const TURNOVER_ROW_INDEX = 40
const TURNOVER_SCROLL_TOP = TURNOVER_ROW_INDEX * ROW_HEIGHT
/** The landing floor for that case, by the same one-window-of-slack rule as {@link FAR_REGION_FLOOR}. */
const TURNOVER_REGION_FLOOR = TURNOVER_ROW_INDEX - 30
/** How many rows the pointer travels once the window has turned over, and so how many rows it passes. */
const TURNOVER_STEP_ROWS = 2
/** Sub-pixel layout and the end of the displacement's easing, both measured within a pixel or so. */
const DISPLACEMENT_TOLERANCE = 2
/** Where inside the scrollport's bottom edge the drag library starts auto-scrolling. */
const AUTOSCROLL_EDGE = 3
const AUTOSCROLL_TICK_MS = 250
/** Generous: the slower kit scrolls at roughly 400 px/s, so ~4 900 px needs about 12 s of holding. */
const AUTOSCROLL_TICKS = 120
const SETTLE_MS = 150
/** How far a gesture moves before its real move, so the drag library has started the drag by then. */
const PICKUP_TRAVEL = 10

/**
 * The windowed rows, in render order.
 *
 * `data-virtual="row"` rather than a bare row selector — and no longer because of spacer rows, of
 * which there are none now: the band is offset by the tbody's own `padding`, so the window's rows are
 * the only rows in it. What the attribute still buys is narrowing to the band. The same tbody may
 * also hold the dragged row as `data-virtual="row-held"` once the window has scrolled past it — out
 * of flow, mounted only to keep the gesture's index space dense — and would hold pinned rows in a
 * grid that pinned any. Neither is part of the window this reads.
 */
const windowedRowIds = (page: Page): Promise<string[]> =>
	page
		.locator('[data-slot="tbody"] [data-slot="tr"][data-virtual="row"][data-row-id]')
		.evaluateAll((rows) => rows.map((row) => row.getAttribute('data-row-id') ?? ''))

/*
 * `.first()`, and not as a shrug: while a drag is in flight the drag library keeps a clone of the
 * dragged row **inside the same `tbody`**, so the id matches twice and Playwright refuses an
 * ambiguous locator under strict mode. `row-drag.spec.ts` documents the same thing. Both carry the
 * same state, so the first is the right one to read — and nothing here counts elements by id, which
 * would be counting the clone.
 */
const rowById = (page: Page, rowId: string) =>
	page.locator(`[data-slot="tbody"] [data-slot="tr"][data-row-id="${rowId}"]`).first()
const handleIn = (row: Locator) => row.locator('[data-slot="row-drag-handle"]')

/**
 * The windowed rows that are actually **inside** the scrollport, below the sticky header.
 *
 * The overscan mounts rows above and below the visible band, and those report a layout box the clip
 * region hides — a pointer sent to one of them lands outside the grid entirely, so a drag started
 * there never starts and a drop aimed there never lands. Only these rows are addressable by a mouse.
 */
const visibleRowIds = (page: Page): Promise<string[]> =>
	page.evaluate(() => {
		const port = document.querySelector('[data-scrollport~="y"]')
		if (port === null) return []
		const portBox = port.getBoundingClientRect()
		const headerBottom = document.querySelector('[data-slot="thead"]')?.getBoundingClientRect().bottom ?? portBox.top
		return [...document.querySelectorAll('[data-slot="tbody"] [data-slot="tr"][data-virtual="row"][data-row-id]')]
			.filter((row) => {
				const box = row.getBoundingClientRect()
				return box.top >= headerBottom && box.bottom <= portBox.bottom
			})
			.map((row) => row.getAttribute('data-row-id') ?? '')
	})

const scrollport = (page: Page) => page.locator('[data-scrollport~="y"]')

/** Jumps the window to a far region and lets the frame land, the way the `scrollBy` fixture does. */
async function scrollTo(page: Page, top: number): Promise<void> {
	await expect(scrollport(page), 'the grid stamps no y scrollport').toHaveCount(1)
	await scrollport(page).evaluate((element, value) => {
		element.scrollTop = value
	}, top)
	await page.evaluate(async () => {
		await new Promise((resolve) => requestAnimationFrame(resolve))
	})
}

/**
 * A row's committed position in the whole 10 000-row list, measured from the top edge of the
 * virtualized `tbody`.
 *
 * This is how the far cases check a landing, instead of scrolling back and reading DOM order: one
 * read answers "where in the list is this row now" without a second scroll to race the virtualizer
 * against. An earlier revision did scroll to the top and read the head, and it reported a false
 * failure — `scrollTop = 0` plus one frame is not enough for the window to re-render, so the previous
 * slice was still mounted and the row that had correctly moved to row ~105 was still in the DOM at
 * its old place. That hazard is unchanged, which is why this still reads geometry rather than order.
 *
 * **What replaced the transform.** This used to read `getComputedStyle(row).transform`'s `m42`,
 * because a virtualized row was absolutely positioned and its `translateY` *was* its index times the
 * row height. The rows are now in normal flow, with no transform at all — the window's band is placed
 * by the tbody's own `paddingTop`, which is the first windowed row's offset in the list, and the band
 * then lays its rows out edge to edge with an explicit inline `height` each. So a row's top minus the
 * **tbody's** top is `paddingTop` plus the row's distance down the band, i.e. the row's offset in the
 * whole list — the same number the transform used to carry, from the one edge that is still fixed
 * while the window turns over. Neither kit gives the tbody a border, so its border box and its
 * padding box share that edge.
 *
 * It holds for the dragged row the window has scrolled past, too, which is the one row still placed
 * by a transform: `data-virtual='row-held'` is `position: absolute; top: 0` inside the `relative`
 * tbody and carries `translateY(start)`, measured from the same edge. Hence no `data-virtual` value
 * in the selector — both kinds of row answer correctly, and narrowing to `row` would make a held row
 * read as "not in the list".
 *
 * The widened selector does admit one row the old one excluded: a **pinned** row with that id, which
 * sticks rather than sitting at its offset and would therefore report a position it does not hold.
 * This example pins nothing, so it cannot arise here — but a virtualized drag example that pinned a
 * row would need `:not([data-pinned])` rather than a re-reading of the number that came back.
 *
 * `-1` while the id matches more than once, which it does for a moment after release: the drag
 * library's clone of the dragged row is still in the `tbody`. Measured, it is gone within a second —
 * so every caller reads this through `expect.poll` and the ambiguity resolves itself rather than
 * being papered over with `.first()`, which here would be a coin toss between the row and its clone.
 */
const committedIndexOf = (page: Page, rowId: string): Promise<number> =>
	page.evaluate(
		({ id, rowHeight }) => {
			const selector = `[data-slot="tbody"] [data-slot="tr"][data-row-id="${id}"]`
			const rows = [...document.querySelectorAll(selector)]
			const row = rows.length === 1 ? rows[0] : undefined
			if (!(row instanceof HTMLElement)) return -1
			const band = row.closest('[data-slot="tbody"][data-virtualized="true"]')
			if (!(band instanceof HTMLElement)) return -1
			return Math.round((row.getBoundingClientRect().top - band.getBoundingClientRect().top) / rowHeight)
		},
		{ id: rowId, rowHeight: ROW_HEIGHT },
	)

/**
 * A real pointer drag, in the shape `row-drag.spec.ts` and `column-drag.spec.ts` established.
 *
 * `page.mouse` rather than `dragTo`: a synthesized drag event does not drive a pointer sensor. The
 * move is taken in steps because a browser starts a drag only once the pointer has actually
 * travelled — a single jump is dropped.
 */
async function dragRowOnto(page: Page, sourceId: string, targetId: string, fraction = 0.5): Promise<void> {
	const handle = await boxOf(handleIn(rowById(page, sourceId)))
	const target = await boxOf(rowById(page, targetId))

	const x = handle.x + handle.width / 2
	const from = handle.y + handle.height / 2
	// Where in the target row the pointer comes to rest. The default is its middle; the one-step cases
	// name a fraction, because for them that position decides whether the gesture survives at all.
	const to = target.y + target.height * fraction

	await page.mouse.move(x, from)
	await page.mouse.down()
	await page.mouse.move(x, from + (to - from) / 2, { steps: 4 })
	await page.mouse.move(x, to, { steps: 4 })
	await page.mouse.up()
}

/** Where a gesture is: the pointer's column, fixed for the whole drag, and its current height. */
type Pointer = { x: number; y: number }

/** Presses on a row's drag handle and moves just far enough for the drag library to start the drag. */
async function pickUp(page: Page, sourceId: string): Promise<Pointer> {
	const handle = await boxOf(handleIn(rowById(page, sourceId)))
	const x = handle.x + handle.width / 2
	const y = handle.y + handle.height / 2

	await page.mouse.move(x, y)
	await page.mouse.down()
	await page.mouse.move(x, y + ROW_HEIGHT / 2, { steps: 3 })

	return { x, y: y + ROW_HEIGHT / 2 }
}

/**
 * Holds the pointer in the band at the scrollport's bottom edge, where the drag library auto-scrolls,
 * until the window has scrolled at least `minScrollTop` — then leaves the band and waits for the
 * scrolling to stop, so whatever is measured next holds still. Returns where the pointer came to rest:
 * the middle of the scrollport.
 */
async function autoScrollHeldRow(page: Page, x: number, minScrollTop: number): Promise<Pointer> {
	const port = await boxOf(scrollport(page))

	await page.mouse.move(x, port.y + port.height - AUTOSCROLL_EDGE, { steps: 6 })
	let top = 0
	for (let tick = 0; tick < AUTOSCROLL_TICKS; tick++) {
		// A pixel of travel per tick: the pointer has to stay inside the band, and a motionless pointer
		// leaves the library's collision detection looking at where it last was.
		await page.mouse.move(x, port.y + port.height - AUTOSCROLL_EDGE - (tick % 2))
		await page.waitForTimeout(AUTOSCROLL_TICK_MS)
		top = await scrollport(page).evaluate((element) => element.scrollTop)
		if (top >= minScrollTop) break
	}
	expect(top, 'the drag library did not auto-scroll the window far enough').toBeGreaterThanOrEqual(minScrollTop)

	// Out of the band, so the scrolling stops and the rows the drop is measured against hold still.
	const middle = port.y + port.height / 2
	await page.mouse.move(x, middle, { steps: 4 })
	await expect
		.poll(async () => {
			const before = await scrollport(page).evaluate((element) => element.scrollTop)
			await page.waitForTimeout(SETTLE_MS)
			const after = await scrollport(page).evaluate((element) => element.scrollTop)
			return before === after
		})
		.toBe(true)

	return { x, y: middle }
}

/**
 * Releases the held row where the drag is showing it, and returns the id of the row shown directly
 * **after** it — the row a landing is asserted against.
 *
 * Once the pointer comes to rest the drag displaces the held row into the slot under it, so the slot
 * under the pointer is the held row's own: the element there is the drag library's placeholder for it,
 * and the row the user is looking at as "where it goes" is the arrangement around that slot rather
 * than any row under the pointer. So this reads the arrangement. It used to read the row under the
 * pointer instead, which was only possible while displacement died with the first window turnover and
 * left some other row there.
 *
 * Why the row *after*, and not the one before: the commit is `dropRow(source, target)` with `target`
 * the last row the held row was displaced past, and it lands the source on `target`'s far side as the
 * **model** orders the two. Every case here drags downwards, so the source is above every far-region row
 * in the model and lands directly behind `target`. The last displacement may have been downwards —
 * `target` is then the row before the held row, and the source lands exactly where it was shown — or,
 * after the pointer settles back up a little, upwards — `target` is then the row after it, and the
 * source lands one past where it was shown. The row shown after the held row is adjacent to the landing
 * in both, which is what {@link expectLandedOn} asserts.
 *
 * Re-centres on the held row's slot before reading: near a row boundary the library can displace back
 * and forth by a row, and the read has to describe the arrangement the release is taken against.
 */
async function releaseOnRestingRow(page: Page, sourceId: string, pointer: Pointer): Promise<string> {
	const slotCentre = await heldSlotCentre(page, sourceId)
	expect(slotCentre, 'the held row occupies no slot in the band before release').not.toBeNull()
	await page.mouse.move(pointer.x, slotCentre ?? pointer.y)
	await page.waitForTimeout(SETTLE_MS)

	const shownAfter = await rowShownAfter(page, sourceId)
	expect(shownAfter, 'no row is shown after the held row at release').not.toBe('')

	await page.mouse.up()

	return shownAfter
}

/**
 * The vertical centre of the slot the held row occupies in the band, or `null`.
 *
 * While a drag is in flight the held row's id is on two elements: the row itself, which the drag
 * library has lifted to `position: fixed` to follow the pointer, and the placeholder it leaves in flow.
 * The placeholder is the slot, so the element that is **not** fixed is the one measured.
 */
function heldSlotCentre(page: Page, sourceId: string): Promise<number | null> {
	return page.evaluate((source) => {
		const slot = [
			...document.querySelectorAll(`[data-slot="tbody"] [data-slot="tr"][data-virtual="row"][data-row-id="${source}"]`),
		].find((row) => getComputedStyle(row).position !== 'fixed')
		if (slot === undefined) return null
		const box = slot.getBoundingClientRect()
		return box.top + box.height / 2
	}, sourceId)
}

/**
 * The row the band shows directly after the held row, by DOM order — the arrangement the drag is
 * showing, read rather than assumed. Both elements carrying the held row's id sit together in the band
 * (see {@link heldSlotCentre}), so the answer is the first windowed row after the last of them.
 */
function rowShownAfter(page: Page, sourceId: string): Promise<string> {
	return page.evaluate((source) => {
		const ids = [
			...document.querySelectorAll('[data-slot="tbody"] [data-slot="tr"][data-virtual="row"][data-row-id]'),
		].map((row) => row.getAttribute('data-row-id') ?? '')
		const last = ids.lastIndexOf(source)
		return last < 0 ? '' : (ids[last + 1] ?? '')
	}, sourceId)
}

/**
 * Drags a row from the top of the list into the far region by holding the pointer in the scrollport's
 * auto-scroll band, then drops it on a row that is genuinely on screen there. Returns the id of the row
 * shown directly after it at release — see {@link releaseOnRestingRow} for why that is the row a landing
 * is asserted against.
 *
 * The target is picked from {@link visibleRowIds} rather than from the window: the overscan mounts
 * rows outside the clip region which report a box no pointer can reach, so aiming at one drops
 * nothing. The dragged row is excluded because it travels with the pointer and a drop onto itself is
 * a no-op that would assert nothing.
 */
async function dragRowFarDown(page: Page, sourceId: string): Promise<string> {
	const { x } = await pickUp(page, sourceId)
	await autoScrollHeldRow(page, x, FAR_SCROLL_TOP)

	const visible = (await visibleRowIds(page)).filter((id) => id !== sourceId)
	const targetId = visible[Math.floor(visible.length / 2)] ?? ''
	expect(targetId, 'the far region rendered no visible row to drop onto').not.toBe('')

	const target = await boxOf(rowById(page, targetId))
	const dropY = target.y + target.height / 2
	await page.mouse.move(x, dropY, { steps: 4 })
	// The library displaces the rows optimistically as the pointer arrives; release once that frame has
	// landed, so the drop is taken against the arrangement the pointer is actually over.
	await expect(rowById(page, targetId)).toBeVisible()
	await page.waitForTimeout(SETTLE_MS * 4)

	return releaseOnRestingRow(page, sourceId, { x, y: dropY })
}

/**
 * The landing, asserted the only way that distinguishes the two defects this spec exists for: the row
 * sits **next to the row it was shown beside at release** (see {@link releaseOnRestingRow}), and it
 * sits in the far region rather than near the top.
 *
 * Asserting only that it left its old place is what would have passed while the row teleported to
 * position 0; asserting only that it reached the far region is what would have passed while the drop's
 * index was 3–4 rows stale.
 */
async function expectLandedOn(
	page: Page,
	sourceId: string,
	targetId: string,
	floor: number = FAR_REGION_FLOOR,
): Promise<void> {
	await expect.poll(() => committedIndexOf(page, sourceId)).toBeGreaterThan(floor)

	const landed = await committedIndexOf(page, sourceId)
	const droppedOn = await committedIndexOf(page, targetId)
	expect(Math.abs(landed - droppedOn), `landed at ${String(landed)}, dropped on ${String(droppedOn)}`).toBe(1)
}

test.describe('virtualized row drag', () => {
	test('a drag inside the window lands where it was dropped', async ({ grid, page }) => {
		await grid.open(EXAMPLE)
		expect((await windowedRowIds(page)).slice(0, INITIAL_HEAD.length)).toEqual(INITIAL_HEAD)

		await dragRowOnto(page, '2', '5')

		// The landing position, not merely "it moved": `2` took `5`'s slot and the rows it left closed up
		// behind it. Both kits agree on this exactly, now that the drop commits a target id rather than
		// an index — an earlier revision had to relax it, because shadcn rested the row on one side of
		// the target and heroui on the other.
		await expect.poll(async () => (await windowedRowIds(page)).slice(0, 6)).toEqual(['1', '3', '4', '5', '2', '6'])
	})

	/*
	 * ONE STEP — a row onto its immediate neighbour, at both of the fractions that used to disagree.
	 *
	 * **There is no threshold any more, and the two cases below pin that.** A one-step drag now commits
	 * wherever in the neighbour it is released, which is what the non-virtual `row-drag` grid has always
	 * done. The fractions are kept — and kept as two cases rather than folded into one — because they
	 * are where the behaviour used to differ: a single case at one fraction would not notice the old
	 * split coming back.
	 *
	 * **What the old split actually was.** It was recorded here as the drag library losing the move, and
	 * that was wrong: `@dnd-kit/dom`'s `OptimisticSortingPlugin` displaced the neighbour and then
	 * un-displaced it, so at release the rows were physically back where they started and the adapter's
	 * neighbour-id anchor correctly observed that nothing had moved. The cause was one level down, in
	 * this package. Every virtualized row was placed out of flow by `transform: translateY(...)`, so the
	 * dragged row's rect travelled with the pointer while its neighbours' rects stayed exactly where
	 * they were — the library had no layout change to animate, and its own displacement bookkeeping
	 * oscillated against geometry that never moved. The rows are in normal flow now, the neighbours
	 * really move aside (see the displacement case below), and the oscillation is gone with the cause.
	 *
	 * **The old measurement, as a record of what the old behaviour was — it no longer reproduces.**
	 * Deltas of the dragged row's top minus the neighbour's top at the fractions used: 0.25 h gave −11.7
	 * under shadcn and −17.7 under heroui, both committing; 0.75 h gave +12.8 and +6.8, neither
	 * committing. Both fractions commit in both kits on this geometry. The fractions are the same for
	 * both kits on purpose — the kits' handles sit ~6 px apart vertically, which was enough to put the
	 * obvious "release over the middle of the next row" on opposite sides of the old line, so a case
	 * written at 0.5 h stated a kit's geometry rather than the library's behaviour.
	 *
	 * **A collision-detector override was tried against the old defect and measured to change nothing,
	 * delta for delta, in both kits** — excluding the drag source's own droppable via `useSortable`'s
	 * `collisionDetector`, with `defaultCollisionDetection` for everything else. It could not work: the
	 * frames that reported the source as the target were the plugin's own explicit
	 * `setDropTarget(source.id)` after it wrote the displaced indices, not collisions, so collision
	 * resolution had no say in them. Kept so that nobody spends a day re-running that experiment on the
	 * next drag defect.
	 */
	const NEIGHBOUR_FRACTION_NEAR = 0.25
	const NEIGHBOUR_FRACTION_FAR = 0.75

	test('a one-step drag released in the near half of the neighbour commits', async ({ grid, page }) => {
		await grid.open(EXAMPLE)
		expect((await windowedRowIds(page)).slice(0, INITIAL_HEAD.length)).toEqual(INITIAL_HEAD)

		await dragRowOnto(page, '2', '3', NEIGHBOUR_FRACTION_NEAR)

		await expect.poll(async () => (await windowedRowIds(page)).slice(0, 6)).toEqual(['1', '3', '2', '4', '5', '6'])
	})

	/**
	 * The other side of the old threshold — a plain assertion, and deliberately no longer a
	 * `test.fail()`.
	 *
	 * It was an expected failure for as long as a release past the neighbour's midpoint committed
	 * nothing, on the reading that the drag library was losing the move. Flow windowing commits it: the
	 * cause was this package placing every virtual row out of flow, not the library. Measured in both
	 * kits before the marker was removed — it failed with "Expected to fail, but passed".
	 */
	test('a one-step drag released past the neighbour commits too', async ({ grid, page }) => {
		await grid.open(EXAMPLE)
		expect((await windowedRowIds(page)).slice(0, INITIAL_HEAD.length)).toEqual(INITIAL_HEAD)

		await dragRowOnto(page, '2', '3', NEIGHBOUR_FRACTION_FAR)

		await expect.poll(async () => (await windowedRowIds(page)).slice(0, 6)).toEqual(['1', '3', '2', '4', '5', '6'])
	})

	/**
	 * One step taken in **one** move and released without the pointer moving again — the gesture with
	 * the least for the adapter to go on, and the one the grid-rendered displacement first broke.
	 *
	 * While a row is held the body renders the drag's arrangement itself, so the drag library's own
	 * reorder stands down, and with it the closing frame the adapter used to read the displaced order
	 * from. The cases above all keep moving after the crossing and so produce later frames that hid
	 * this; released straight after a single crossing, the drag read as never having travelled and was
	 * refused — measured five times out of five in both kits before the adapter re-took its reading once
	 * the grid's render had landed.
	 */
	test('a one-step drag released straight after the crossing commits', async ({ grid, page }) => {
		await grid.open(EXAMPLE)
		expect((await windowedRowIds(page)).slice(0, INITIAL_HEAD.length)).toEqual(INITIAL_HEAD)

		const handle = await boxOf(handleIn(rowById(page, '2')))
		const target = await boxOf(rowById(page, '3'))
		const x = handle.x + handle.width / 2
		const from = handle.y + handle.height / 2

		await page.mouse.move(x, from)
		await page.mouse.down()
		// Just far enough to start the drag, then the crossing as a single move, then nothing.
		await page.mouse.move(x, from + PICKUP_TRAVEL, { steps: 3 })
		await page.mouse.move(x, target.y + target.height / 2)
		await page.mouse.up()

		await expect.poll(async () => (await windowedRowIds(page)).slice(0, 6)).toEqual(['1', '3', '2', '4', '5', '6'])
	})

	/**
	 * The displacement itself, **while the pointer is still down** — the behaviour the whole flow-windowing
	 * change exists to produce, and the one thing no spec in either kit asserted.
	 *
	 * Every other case here reads the committed order after release, which a grid can get right while
	 * showing the user nothing at all on the way there: that was exactly the old state, where the dragged
	 * row's rect travelled with the pointer and its neighbours' rects stayed put because each row was
	 * placed by its own `transform`. In flow the drag library reorders the DOM nodes and animates the
	 * layout change, so the rows between the source and the target move up by one row's height.
	 *
	 * Rows `4` and `5` are the two the pointer unambiguously passes over. Row `6` is left out on purpose:
	 * the gesture ends three row-heights from the handle's centre, which lands within a few pixels of
	 * row `6`'s boundary, and the two kits' handles sit ~6 px apart vertically — so whether `6` has
	 * displaced yet states a kit's geometry rather than the displacement. Row `3` is the source and row
	 * ids are the record's `id` field numbered from one, so this gesture starts at model index 2: a
	 * non-zero offset, which a zero one could not distinguish from no offset at all.
	 */
	test('the rows between the source and the target move aside while the row is held', async ({ grid, page }) => {
		await grid.open(EXAMPLE)
		expect((await windowedRowIds(page)).slice(0, INITIAL_HEAD.length)).toEqual(INITIAL_HEAD)

		const topOf = async (rowId: string) => (await boxOf(rowById(page, rowId))).y
		const before = { four: await topOf('4'), five: await topOf('5') }

		const handle = await boxOf(handleIn(rowById(page, '3')))
		const x = handle.x + handle.width / 2
		const from = handle.y + handle.height / 2

		await page.mouse.move(x, from)
		await page.mouse.down()
		// In steps, like every other gesture here: a browser starts a drag only once the pointer has
		// actually travelled, and a single jump is dropped.
		await page.mouse.move(x, from + ROW_HEIGHT * 3, { steps: 16 })

		/*
		 * Both up by exactly one row's height — and both inside the poll, which is not a courtesy to the
		 * second one. The drag library animates the displacement, and the two rows do not land on the
		 * same frame: measured in heroui, row 4 was already at its full 49 while row 5 was at 43, i.e.
		 * still on its easing tail. Asserting the pair together waits for the arrangement rather than
		 * for one row of it.
		 */
		await expect
			.poll(async () => [Math.round(before.four - (await topOf('4'))), Math.round(before.five - (await topOf('5')))], {
				message: 'rows 4 and 5 did not move aside for the row being dragged over them',
			})
			.toEqual([ROW_HEIGHT, ROW_HEIGHT])

		await page.mouse.up()
	})

	/**
	 * The case the whole phase is about.
	 *
	 * **Driven by the library's own auto-scroll, and that is not a preference.** Two cheaper,
	 * deterministic drives were measured first and neither produces a drop at all: setting `scrollTop`
	 * on the scrollport mid-drag, and `page.mouse.wheel` mid-drag. In both the gesture stays live
	 * (`data-row-dragging` is still `true` at release) and the release commits **nothing** — the order
	 * is byte-identical to the initial one. A scroll the drag library did not itself perform leaves its
	 * collision state behind, so there is no drop target to commit. Holding the pointer in the
	 * auto-scroll band costs real wall clock, which is why the far cases are `test.slow()`.
	 */
	test('a drag survives the window changing under it and lands at the drop target', async ({ grid, page }) => {
		test.slow()
		await grid.open(EXAMPLE)
		expect((await windowedRowIds(page)).slice(0, INITIAL_HEAD.length)).toEqual(INITIAL_HEAD)

		// Index 5 of the list, the start the PRD names.
		const sourceId = '6'
		const targetId = await dragRowFarDown(page, sourceId)

		await expectLandedOn(page, sourceId, targetId)
	})

	/**
	 * The **first** row dragged far down — the gesture the old index-based refusal rejected silently.
	 *
	 * It is its own case rather than a parameter of the one above because the refusal that used to eat
	 * it was specific to this row: the guard compared the dragged item's index against the index it
	 * started at, and in a window that has scrolled away those two numbers can agree for a row that
	 * really did move. The anchor is now a neighbour **id** — the row before the source, or the row
	 * after it when the source is first — and the first row is exactly the case that takes the second
	 * branch. It is also the most ordinary thing a user does to a long grid: move this to the bottom.
	 *
	 * Downward only. The mirror (last row dragged up) needs the list scrolled to its end before the
	 * gesture starts and a second ~12 s of auto-scrolling, and it exercises the same branch from the
	 * other side; the unit tests cover the anchor's two arms directly.
	 */
	test('the first row drags far down and lands at the drop target', async ({ grid, page }) => {
		test.slow()
		await grid.open(EXAMPLE)
		expect((await windowedRowIds(page)).slice(0, INITIAL_HEAD.length)).toEqual(INITIAL_HEAD)

		const sourceId = '1'
		const targetId = await dragRowFarDown(page, sourceId)

		await expectLandedOn(page, sourceId, targetId)
		// And the row that was second is now first — the move really left the top of the list, rather
		// than the guard having refused it and the row having stayed put.
		await scrollTo(page, 0)
		await expect.poll(async () => (await windowedRowIds(page))[0]).toBe('2')
	})

	/**
	 * Displacement **after** the window has turned over under the drag — the case the in-flow band alone
	 * did not fix, reported from use rather than found by a spec.
	 *
	 * The displacement case above runs inside the first window, where nothing re-renders mid-gesture. Once
	 * the drag library's auto-scroll has carried the row a window or more down, the body has re-rendered on
	 * every frame of that scroll, and it used to re-render in **model** order with the held row at its
	 * original place — while the library had moved that row's DOM node and its sortable index to where the
	 * pointer took it. The two orders then disagreed about the held row, the library's index space had a
	 * gap and a duplicate, and its optimistic sorting bails on any space that is not exactly `0..n-1`: the
	 * neighbours stopped moving for the rest of the gesture. Measured: before the fix no visible row moved
	 * at all when the pointer then travelled over two of them.
	 *
	 * So this reads the visible rows' tops, moves the pointer down over two rows, and asserts that a
	 * neighbour moved by one row's height — any of them, since which rows the pointer passes depends on
	 * where the held row rests after the scroll, which is a kit's geometry. Then the drop, the same way the
	 * far cases assert it.
	 */
	test('neighbours keep moving aside after the window turns over under the drag', async ({ grid, page }) => {
		test.slow()
		await grid.open(EXAMPLE)
		expect((await windowedRowIds(page)).slice(0, INITIAL_HEAD.length)).toEqual(INITIAL_HEAD)

		const sourceId = '2'
		const { x } = await pickUp(page, sourceId)
		const resting = await autoScrollHeldRow(page, x, TURNOVER_SCROLL_TOP)
		// The arrangement the pointer's arrival in the middle produced has to land before it is the baseline.
		await page.waitForTimeout(SETTLE_MS * 4)

		const topsOf = (): Promise<Record<string, number>> =>
			page.evaluate((source) => {
				const tops: Record<string, number> = {}
				for (const row of document.querySelectorAll(
					'[data-slot="tbody"] [data-slot="tr"][data-virtual="row"][data-row-id]',
				)) {
					const id = row.getAttribute('data-row-id') ?? ''
					if (id !== source) tops[id] = row.getBoundingClientRect().top
				}
				return tops
			}, sourceId)
		const visible = new Set((await visibleRowIds(page)).filter((id) => id !== sourceId))
		const before = await topsOf()

		const to = resting.y + ROW_HEIGHT * TURNOVER_STEP_ROWS
		await page.mouse.move(x, to, { steps: 8 })

		await expect
			.poll(
				async () => {
					const after = await topsOf()
					return [...visible].some((id) => {
						const from = before[id]
						const now = after[id]
						if (from === undefined || now === undefined) return false
						return Math.abs(Math.abs(now - from) - ROW_HEIGHT) <= DISPLACEMENT_TOLERANCE
					})
				},
				{ message: 'no visible row moved aside after the window turned over under the drag' },
			)
			.toBe(true)

		const targetId = await releaseOnRestingRow(page, sourceId, { x, y: to })

		await expectLandedOn(page, sourceId, targetId, TURNOVER_REGION_FLOOR)
	})

	test('Escape cancels the drag and leaves the order untouched', async ({ grid, page }) => {
		await grid.open(EXAMPLE)
		expect((await windowedRowIds(page)).slice(0, INITIAL_HEAD.length)).toEqual(INITIAL_HEAD)

		const handle = await boxOf(handleIn(rowById(page, '2')))
		const target = await boxOf(rowById(page, '5'))
		const x = handle.x + handle.width / 2
		const from = handle.y + handle.height / 2
		const to = target.y + target.height / 2

		await page.mouse.move(x, from)
		await page.mouse.down()
		await page.mouse.move(x, from + (to - from) / 2, { steps: 4 })
		await page.mouse.move(x, to, { steps: 4 })
		await page.keyboard.press('Escape')
		await page.mouse.up()

		/*
		 * Both halves matter here. The order is the state, and the dragged row is deliberately held
		 * mounted for the length of the gesture — it is its own `isDragging` going false that releases
		 * it — so a cancel must also leave the rendering clean, i.e. no duplicate of the dragged row
		 * left behind in the window.
		 */
		await expect.poll(async () => (await windowedRowIds(page)).slice(0, INITIAL_HEAD.length)).toEqual(INITIAL_HEAD)
		const ids = await windowedRowIds(page)
		expect(ids.filter((id) => id === '2')).toHaveLength(1)
	})
})
