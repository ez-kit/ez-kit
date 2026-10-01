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
/** Where inside the scrollport's bottom edge the drag library starts auto-scrolling. */
const AUTOSCROLL_EDGE = 3
const AUTOSCROLL_TICK_MS = 250
/** Generous: the slower kit scrolls at roughly 400 px/s, so ~4 900 px needs about 12 s of holding. */
const AUTOSCROLL_TICKS = 120
const SETTLE_MS = 150

/**
 * The windowed rows, in render order.
 *
 * `data-virtual="row"` rather than a bare row selector: the virtualizer mounts spacer rows around
 * the slice, and only the real ones carry an id to read.
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
 * A row's committed position in the whole 10 000-row list, read from the transform the virtualizer
 * positions it with.
 *
 * This is how the far cases check a landing, instead of scrolling back and reading DOM order: a
 * virtualized row's `translateY` **is** its index times the row height, so one read answers "where in
 * the list is this row now" without a second scroll to race the virtualizer against. An earlier
 * revision did scroll to the top and read the head, and it reported a false failure — `scrollTop = 0`
 * plus one frame is not enough for the window to re-render, so the previous slice was still mounted
 * and the row that had correctly moved to row ~105 was still in the DOM at its old place.
 *
 * `-1` while the id matches more than once, which it does for a moment after release: the drag
 * library's clone of the dragged row is still in the `tbody`. Measured, it is gone within a second —
 * so every caller reads this through `expect.poll` and the ambiguity resolves itself rather than
 * being papered over with `.first()`, which here would be a coin toss between the row and its clone.
 */
const committedIndexOf = (page: Page, rowId: string): Promise<number> =>
	page.evaluate(
		({ id, rowHeight }) => {
			const selector = `[data-slot="tbody"] [data-slot="tr"][data-virtual="row"][data-row-id="${id}"]`
			const rows = [...document.querySelectorAll(selector)]
			const row = rows.length === 1 ? rows[0] : undefined
			if (row === undefined) return -1
			return Math.round(new DOMMatrixReadOnly(getComputedStyle(row).transform).m42 / rowHeight)
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

/**
 * Drags a row from the top of the list into the far region by holding the pointer in the scrollport's
 * auto-scroll band, then drops it on a row that is genuinely on screen there. Returns that row's id.
 *
 * The target is picked from {@link visibleRowIds} rather than from the window: the overscan mounts
 * rows outside the clip region which report a box no pointer can reach, so aiming at one drops
 * nothing. The dragged row is excluded because it travels with the pointer and a drop onto itself is
 * a no-op that would assert nothing.
 */
async function dragRowFarDown(page: Page, sourceId: string): Promise<string> {
	const port = await boxOf(scrollport(page))
	const handle = await boxOf(handleIn(rowById(page, sourceId)))
	const x = handle.x + handle.width / 2
	const y = handle.y + handle.height / 2

	await page.mouse.move(x, y)
	await page.mouse.down()
	await page.mouse.move(x, y + ROW_HEIGHT / 2, { steps: 3 })

	// Into the band at the bottom edge where the drag library auto-scrolls, and held there until the
	// window has reached a region that shares no row with the one the drag started in.
	await page.mouse.move(x, port.y + port.height - AUTOSCROLL_EDGE, { steps: 6 })
	let top = 0
	for (let tick = 0; tick < AUTOSCROLL_TICKS; tick++) {
		// A pixel of travel per tick: the pointer has to stay inside the band, and a motionless pointer
		// leaves the library's collision detection looking at where it last was.
		await page.mouse.move(x, port.y + port.height - AUTOSCROLL_EDGE - (tick % 2))
		await page.waitForTimeout(AUTOSCROLL_TICK_MS)
		top = await scrollport(page).evaluate((element) => element.scrollTop)
		if (top >= FAR_SCROLL_TOP) break
	}
	expect(top, 'the drag library did not auto-scroll the window to the far region').toBeGreaterThanOrEqual(
		FAR_SCROLL_TOP,
	)

	// Out of the band, so the scrolling stops and the rows the drop is measured against hold still.
	await page.mouse.move(x, port.y + port.height / 2, { steps: 4 })
	await expect
		.poll(async () => {
			const before = await scrollport(page).evaluate((element) => element.scrollTop)
			await page.waitForTimeout(SETTLE_MS)
			const after = await scrollport(page).evaluate((element) => element.scrollTop)
			return before === after
		})
		.toBe(true)

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

	/*
	 * Re-centre on whatever row the pointer has come to rest over before letting go. Between the move
	 * above and this point the library displaces the rows by a row's height, so the pointer can end up
	 * within a pixel or two of a row boundary — and there the DOM read below and the library's own hit
	 * test can resolve to different neighbours, which is a one-row disagreement between what the spec
	 * believes it dropped on and what was committed. Landing the pointer back on a row's centre removes
	 * the ambiguity instead of tolerating it.
	 */
	const resting = await rowUnderPointer(page, x, dropY, sourceId)
	expect(resting, 'no row under the pointer before release').not.toBe('')
	const restingBox = await boxOf(rowById(page, resting))
	await page.mouse.move(x, restingBox.y + restingBox.height / 2)
	await page.waitForTimeout(SETTLE_MS)

	const underPointer = await rowUnderPointer(page, x, restingBox.y + restingBox.height / 2, sourceId)
	expect(underPointer, 'no row under the pointer at release').not.toBe('')

	await page.mouse.up()

	return underPointer
}

/**
 * The row the pointer is **actually** over, read rather than assumed.
 *
 * The target a far drag picked was chosen a few hundred milliseconds before release, and the library
 * displaces the rows under the pointer in between — so the row let go of is not necessarily the row
 * aimed at. The contract is that the dragged row lands next to the row the pointer was over when it was
 * released, so that row is what the caller asserts against; this is a faithful reading of the gesture,
 * not a loosened assertion. The dragged row itself is skipped because its clone travels with the
 * pointer and sits on top of everything.
 */
function rowUnderPointer(page: Page, px: number, py: number, sourceId: string): Promise<string> {
	return page.evaluate(
		({ atX, atY, source }) =>
			document
				.elementsFromPoint(atX, atY)
				.map((element) => element.closest('[data-slot="tr"][data-row-id]'))
				.find((row) => row !== null && row.getAttribute('data-row-id') !== source)
				?.getAttribute('data-row-id') ?? '',
		{ atX: px, atY: py, source: sourceId },
	)
}

/**
 * The landing, asserted the only way that distinguishes the two defects this spec exists for: the row
 * sits **next to the row it was dropped on**, and it sits in the far region rather than near the top.
 *
 * Asserting only that it left its old place is what would have passed while the row teleported to
 * position 0; asserting only that it reached the far region is what would have passed while the drop's
 * index was 3–4 rows stale.
 */
async function expectLandedOn(page: Page, sourceId: string, targetId: string): Promise<void> {
	await expect.poll(() => committedIndexOf(page, sourceId)).toBeGreaterThan(FAR_REGION_FLOOR)

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
	 * ONE STEP — a row onto its immediate neighbour, and the measured rule it obeys.
	 *
	 * **A one-step drag commits only while the dragged row's top stays above the neighbour's top.**
	 * Past that point `@dnd-kit/dom`'s `OptimisticSortingPlugin` displaces the neighbour and then
	 * un-displaces it — the raw target alternates `neighbour, source, neighbour, source`, two moves that
	 * cancel — so at release the rows are physically back where they started and the adapter's
	 * neighbour-id anchor correctly observes that nothing moved. The refusal is right; the move is lost
	 * upstream, in the plugin.
	 *
	 * **Virtualization is required for it.** Every row here is absolutely positioned by
	 * `transform: translateY(...)`, so the dragged row's rect travels with the pointer while its
	 * neighbours' stay put; the same sweep on the non-virtual `row-drag` grid commits at every fraction,
	 * in both kits.
	 *
	 * **A collision-detector override was tried and measured to change nothing, delta for delta, in both
	 * kits** — excluding the drag source's own droppable via `useSortable`'s `collisionDetector`, with
	 * `defaultCollisionDetection` for everything else. It cannot work: the frames that report the source
	 * as the target are the plugin's own explicit `setDropTarget(source.id)` after it writes the
	 * displaced indices, not collisions, so collision resolution has no say in them. Do not spend a day
	 * re-running that experiment.
	 *
	 * The two cases below pin both sides of the threshold. Measured deltas (dragged row's top minus the
	 * neighbour's top) at the fractions used: 0.25 h gives −11.7 under shadcn and −17.7 under heroui,
	 * both committing; 0.75 h gives +12.8 and +6.8, neither committing. The fractions are the same for
	 * both kits on purpose — the kits' handles sit ~6 px apart vertically, which is enough to put the
	 * obvious "release over the middle of the next row" on opposite sides of the line, so a case written
	 * at 0.5 h would state a kit's geometry rather than the library's behaviour.
	 */
	const NEIGHBOUR_FRACTION_COMMITS = 0.25
	const NEIGHBOUR_FRACTION_LOST = 0.75

	test('a one-step drag commits while the dragged row stays above the neighbour', async ({ grid, page }) => {
		await grid.open(EXAMPLE)
		expect((await windowedRowIds(page)).slice(0, INITIAL_HEAD.length)).toEqual(INITIAL_HEAD)

		await dragRowOnto(page, '2', '3', NEIGHBOUR_FRACTION_COMMITS)

		await expect.poll(async () => (await windowedRowIds(page)).slice(0, 6)).toEqual(['1', '3', '2', '4', '5', '6'])
	})

	/**
	 * The other side of the threshold, as an **expected failure** rather than a skip.
	 *
	 * `test.fail()` keeps the suite green on today's `@dnd-kit/dom` and turns red the day the plugin stops
	 * losing the move — which is the notification wanted, and what a `skip` or a deleted case would not
	 * give. If this one starts passing, delete it and widen the case above to every fraction.
	 */
	test('a one-step drag past the neighbour is lost by the drag library', async ({ grid, page }) => {
		test.fail()
		await grid.open(EXAMPLE)
		expect((await windowedRowIds(page)).slice(0, INITIAL_HEAD.length)).toEqual(INITIAL_HEAD)

		await dragRowOnto(page, '2', '3', NEIGHBOUR_FRACTION_LOST)

		await expect.poll(async () => (await windowedRowIds(page)).slice(0, 6)).toEqual(['1', '3', '2', '4', '5', '6'])
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
