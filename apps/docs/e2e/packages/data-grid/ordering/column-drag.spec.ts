import { boxOf, expect, test } from '../../../fixtures'

import type { Locator, Page } from '@playwright/test'

/**
 * Dragging a column by its header handle.
 *
 * The column axis' twin of `row-drag.spec.ts`, and the same reason it exists: the displacement
 * during a drag is a transform the drag library applies and the commit happens once, on release.
 * Neither is observable in jsdom, which reports every element as zero-sized — so this is the only
 * place the gesture is exercised.
 *
 * Written against `data-*` attributes and run once per kit by the project matrix.
 */

const EXAMPLE = 'column-drag'
const RTL_EXAMPLE = 'column-drag-rtl'

/**
 * The leaf columns, in the order `column-drag.tsx` declares them.
 *
 * Named rather than derived, because a **group** header carries `data-column-id` too and the two
 * kits do not render the same header rows: shadcn draws the group row, heroui drops it (React Aria
 * removed nested columns before GA). Filtering the DOM down to this set reads the same in both.
 */
const LEAF_COLUMNS = ['id', 'name', 'department', 'joinedAt', 'salary']

const columnOrder = async (page: Page): Promise<string[]> => {
	const ids = await page
		.locator('[data-slot="thead"] [data-slot="th"][data-column-id]')
		.evaluateAll((cells) => cells.map((cell) => cell.getAttribute('data-column-id') ?? ''))
	return ids.filter((id) => LEAF_COLUMNS.includes(id))
}

/*
 * `.first()`, for the reason the row spec records: while a drag is in flight the library keeps a
 * clone of the dragged element in the same container, so the id matches twice and Playwright refuses
 * an ambiguous locator under strict mode. Both carry the same state, so the first is the right one.
 */
const headerById = (page: Page, columnId: string) =>
	page.locator(`[data-slot="th"][data-column-id="${columnId}"]`).first()
const handleIn = (header: Locator) => header.locator('[data-slot="column-drag-handle"]')

/**
 * A real pointer drag along the inline axis, in the shape the resizing and row-drag specs
 * established.
 *
 * `page.mouse` rather than `dragTo`: the repo uses none, and a synthesized drag event does not drive
 * a pointer sensor. The move is taken in steps because a browser starts a drag only once the pointer
 * has actually travelled — a single jump is dropped.
 *
 * **One leg per neighbour crossed, and the reason is not geometry.** `steps: N` really does dispatch
 * N interpolated moves, so event count was never what was missing. What matters is that each
 * `setDropTarget` **disables the collision observer** until `manager.renderer.rendering` resolves and
 * re-enables it in a `.then` (`@dnd-kit/abstract@0.1.21`): moves arriving in between are dropped on
 * the floor. A leg is an `await` boundary, so it is legs — not steps — that let the microtask queue
 * drain and React flush, and a drag needs one projection per neighbour it passes. Measured: the same
 * `name` → `salary` drag committed nothing in two legs and correctly in three.
 *
 * Derived rather than tuned, therefore. A fixed count would be fitted to this example's distances and
 * would silently under-sample the first longer drag someone writes — which looks exactly like a
 * missing commit. A real pointer needs none of this: it produces the same moves with real time
 * between them.
 */
async function dragColumnOnto(page: Page, sourceId: string, targetId: string, midDrag?: () => Promise<void>) {
	const order = await columnOrder(page)
	const legs = Math.max(Math.abs(order.indexOf(targetId) - order.indexOf(sourceId)), 1)

	const handle = await boxOf(handleIn(headerById(page, sourceId)))
	const target = await boxOf(headerById(page, targetId))

	const from = { x: handle.x + handle.width / 2, y: handle.y + handle.height / 2 }
	const to = { x: target.x + target.width / 2, y: from.y }
	const dx = to.x - from.x

	await page.mouse.move(from.x, from.y)
	await page.mouse.down()
	for (let leg = 1; leg <= legs; leg++) {
		await page.mouse.move(from.x + (dx * leg) / legs, from.y, { steps: 6 })
	}
	if (midDrag) await midDrag()
	await page.mouse.up()
}

test.describe('column drag', () => {
	test('moves a column within its header group and commits exactly once', async ({ grid, page }) => {
		await grid.open(EXAMPLE)
		expect(await columnOrder(page)).toEqual(LEAF_COLUMNS)

		await dragColumnOnto(page, 'name', 'joinedAt')

		// The column landed where it was dropped, and its siblings closed up behind it.
		await expect.poll(() => columnOrder(page)).toEqual(['id', 'department', 'joinedAt', 'name', 'salary'])
		// One gesture, one commit — the point of committing on release rather than per frame.
		await expect(page.getByTestId('column-drag-commits')).toHaveText('1')
	})

	test('marks the dragged header and commits nothing until release', async ({ grid, page }) => {
		await grid.open(EXAMPLE)

		await dragColumnOnto(page, 'name', 'joinedAt', async () => {
			await expect(headerById(page, 'name')).toHaveAttribute('data-column-dragging', 'true')
			/*
			 * The **state** is what stays untouched until release — not the markup. The library
			 * displaces the columns optimistically as the pointer moves, so the DOM order has already
			 * changed here and an id appears twice (the original and its clone). Asserting the DOM
			 * order mid-drag would be asserting the library's animation, which is its business; the
			 * grid's promise is that nothing is committed until the pointer comes up.
			 */
			await expect(page.getByTestId('column-drag-commits')).toHaveText('0')
		})

		await expect(page.getByTestId('column-drag-commits')).toHaveText('1')
	})

	test('Escape cancels the drag and writes nothing', async ({ grid, page }) => {
		await grid.open(EXAMPLE)

		const handle = await boxOf(handleIn(headerById(page, 'name')))
		const target = await boxOf(headerById(page, 'joinedAt'))
		const y = handle.y + handle.height / 2
		const x = handle.x + handle.width / 2
		const toX = target.x + target.width / 2

		await page.mouse.move(x, y)
		await page.mouse.down()
		await page.mouse.move(x + (toX - x) / 2, y, { steps: 4 })
		await page.mouse.move(toX, y, { steps: 4 })
		await page.keyboard.press('Escape')
		await page.mouse.up()

		await expect.poll(() => columnOrder(page)).toEqual(LEAF_COLUMNS)
		await expect(page.getByTestId('column-drag-commits')).toHaveText('0')
	})

	/**
	 * The PRD's success criterion for this phase, and what it actually looks like once the refusal
	 * happens **before** the displacement rather than after it.
	 *
	 * Dragging `name` at `salary` — which is in another header group — does not move it there and does
	 * not do nothing either: it travels as far as its own group allows and lands at that edge. That
	 * is the honest outcome, and it is also what the user watched happen, because the illegal step is
	 * the only one that never took place.
	 *
	 * Runs in **both** kits, not just shadcn: heroui drops the group header *row* from the rendered
	 * collection, but the column model still knows each leaf's parent, and the parent is what the
	 * boundary is read from. What is missing there is the decoration, not the boundary.
	 *
	 * The third assertion is the one an earlier revision could not satisfy. Refusing only at release
	 * left the drag library's own indices permuted with nothing to put them back — the header stayed
	 * visibly reordered and the **next** drag on the axis committed nothing. So this case drags again
	 * afterwards: the axis has to survive the attempt.
	 */
	test('a leaf stops at its group edge instead of leaving it, and the axis survives', async ({ grid, page }) => {
		await grid.open(EXAMPLE)

		await dragColumnOnto(page, 'name', 'salary')

		// `name` is last within `Details` and still before `salary`, which it may not pass.
		await expect.poll(() => columnOrder(page)).toEqual(['id', 'department', 'joinedAt', 'name', 'salary'])
		await expect(page.getByTestId('column-drag-commits')).toHaveText('1')

		// And the axis still works.
		await dragColumnOnto(page, 'name', 'department')

		await expect(page.getByTestId('column-drag-commits')).toHaveText('2')
		await expect.poll(() => columnOrder(page)).toEqual(['id', 'name', 'department', 'joinedAt', 'salary'])
	})

	test('a locked column offers no handle', async ({ grid, page }) => {
		await grid.open(EXAMPLE)

		// `id` is declared `ordering: false`, so it takes part in the drag's index space as a
		// disabled item and renders no control that promises a gesture.
		await expect(handleIn(headerById(page, 'id'))).toHaveCount(0)
		await expect(handleIn(headerById(page, 'name'))).toHaveCount(1)
	})

	test('the resizer still resizes, and moves nothing', async ({ grid, page }) => {
		await grid.open(EXAMPLE)

		const header = headerById(page, 'name')
		const before = await boxOf(header)
		const resizer = header.locator('[data-slot="column-resizer"]')
		const handle = await boxOf(resizer)
		const y = handle.y + handle.height / 2
		const x = handle.x + handle.width / 2

		await page.mouse.move(x, y)
		await page.mouse.down()
		await page.mouse.move(x + 30, y)
		await page.mouse.move(x + 60, y)
		await page.mouse.up()

		await expect.poll(async () => (await boxOf(headerById(page, 'name'))).width).toBeGreaterThan(before.width + 20)
		expect(await columnOrder(page)).toEqual(LEAF_COLUMNS)
		await expect(page.getByTestId('column-drag-commits')).toHaveText('0')
	})

	/**
	 * RTL, stated as a **relation** so an LTR layout fails it rather than satisfying it.
	 *
	 * Under `dir="rtl"` the inline axis runs right to left, so the *later* a column sits in the
	 * order, the further **left** it is drawn. Dragging `name` leftwards therefore has to move it
	 * later in the order; on an LTR layout the same gesture would move it earlier.
	 */
	test('drags along the inline axis under RTL', async ({ grid, page }) => {
		await grid.open(RTL_EXAMPLE)

		const name = await boxOf(headerById(page, 'name'))
		const joined = await boxOf(headerById(page, 'joinedAt'))
		// The precondition the relation rests on: `joinedAt` comes later in the order and is drawn
		// to the left of `name`. This is the assertion that fails on an LTR layout.
		expect(joined.x).toBeLessThan(name.x)

		await dragColumnOnto(page, 'name', 'joinedAt')

		await expect.poll(() => columnOrder(page)).toEqual(['id', 'department', 'joinedAt', 'name', 'salary'])
		await expect(page.getByTestId('column-drag-commits')).toHaveText('1')
	})
})
