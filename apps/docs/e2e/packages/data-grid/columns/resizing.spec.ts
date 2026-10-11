import { boxOf, expect, test } from '../../../fixtures'

import type { GridFixture } from '../../../fixtures'
import type { Locator, Page } from '@playwright/test'

/**
 * Column resizing, in both commit modes.
 *
 * Widths are measured on a **body** cell, not on the header the handle lives in. The two are
 * driven by one `--grid-template-columns` track list, so a resize that moved only the header
 * would be a broken grid — and a header-only assertion could not tell the difference.
 *
 * The drag is a real pointer sequence (`mouse.down` / `move` / `up`) rather than a synthesised
 * event, because that is the only way `mode: 'onEnd'` can be told from `mode: 'onChange'`: the
 * whole difference between them is what happens *between* down and up.
 */

const ON_CHANGE = 'resizing-on-change'
const ON_END = 'resizing-on-end'

/**
 * `resizableColumns` in `apps/docs/shared/data-grid/examples/components/_data.ts`.
 *
 * A column that names a starting width renders at it; `email` names none, so it fills the rest.
 * `active` has `resizing: false`, which pins its width.
 */
const NAME_DEFAULT = 200
const NAME_MIN = 80
const NAME_MAX = 400
const AGE_DEFAULT = 80
const ACTIVE_WIDTH = 100
const COLUMN_IDS = ['name', 'email', 'age', 'active'] as const
/** `active` is the one column that opts out with `resizing: false`. */
const RESIZABLE_COLUMNS = 3

const DRAG_BY = 90
/** Comfortably past `max`, and past `min` in the other direction. */
const DRAG_FAR = 500

const resizerIn = (header: Locator) => header.locator('[data-slot="column-resizer"]')

/** The rendered width of a column, read from a body cell — the header is not the grid. */
async function columnWidth(grid: GridFixture, columnId: string): Promise<number> {
	return (await boxOf(await grid.cell(0, columnId))).width
}

/**
 * Drags a resize handle by `dx`, reporting the width partway through.
 *
 * The pointer is moved in two steps: a browser only starts a drag once the pointer has actually
 * travelled, and a single jump from down to destination is dropped by some handlers entirely.
 */
async function dragResizer(page: Page, header: Locator, dx: number, midDrag?: () => Promise<void>): Promise<void> {
	const handle = await boxOf(resizerIn(header))
	const y = handle.y + handle.height / 2
	const x = handle.x + handle.width / 2

	await page.mouse.move(x, y)
	await page.mouse.down()
	await page.mouse.move(x + dx / 2, y)
	await page.mouse.move(x + dx, y)
	if (midDrag) await midDrag()
	await page.mouse.up()
}

test.describe('a grid with resizable columns', () => {
	test.beforeEach(async ({ grid }) => {
		await grid.open(ON_CHANGE)
	})

	test('offers a handle on every column that did not opt out', async ({ page, grid }) => {
		await expect(page.locator('[data-slot="column-resizer"]')).toHaveCount(RESIZABLE_COLUMNS)

		await expect(grid.header('name')).toHaveAttribute('data-resizable', 'true')
		// `resizing: false` on this one — no handle, and it does not claim to have one. It is
		// still a column: `toHaveCount(0)` inside a header that stopped rendering says nothing.
		await expect(grid.header('active')).toHaveCount(1)
		await expect(grid.header('active')).not.toHaveAttribute('data-resizable', 'true')
		await expect(resizerIn(grid.header('active'))).toHaveCount(0)
	})

	test('the handle is reachable as a separator, by name', async ({ grid }) => {
		await expect(resizerIn(grid.header('name')).and(grid.header('name').getByRole('separator'))).toHaveCount(1)
		await expect(resizerIn(grid.header('name'))).toHaveAttribute('aria-label', 'Resize column')
	})

	// Resizing used to fix every track, which left the right of a resizable grid empty.
	test('the columns fill the width of the grid', async ({ grid, page }) => {
		const scrollport = page.locator('[data-scrollport]')
		const available = await scrollport.evaluate((el) => el.clientWidth)
		const widths = await Promise.all(COLUMN_IDS.map((id) => columnWidth(grid, id)))

		expect(widths.reduce((sum, width) => sum + width, 0)).toBeCloseTo(available, -1)
	})

	test('a column that names a width starts at it', async ({ grid }) => {
		expect(await columnWidth(grid, 'name')).toBeCloseTo(NAME_DEFAULT, 0)
		expect(await columnWidth(grid, 'age')).toBeCloseTo(AGE_DEFAULT, 0)
		expect(await columnWidth(grid, 'active')).toBeCloseTo(ACTIVE_WIDTH, 0)
	})

	test('dragging the handle narrows the column, body and all', async ({ grid, page }) => {
		await dragResizer(page, grid.header('name'), -DRAG_BY)

		expect(await columnWidth(grid, 'name')).toBeCloseTo(NAME_DEFAULT - DRAG_BY, -1)
	})

	// The drag starts from the width on screen. Starting from the one in state — the 150px
	// TanStack gives a column that names no width — would snap it there on the first move.
	test('dragging a filling column starts from the width it renders at', async ({ grid, page }) => {
		const before = await columnWidth(grid, 'email')

		await dragResizer(page, grid.header('email'), -DRAG_BY)

		expect(await columnWidth(grid, 'email')).toBeCloseTo(before - DRAG_BY, -1)
	})

	test('dragging it back widens the column again', async ({ grid, page }) => {
		const before = await columnWidth(grid, 'name')
		await dragResizer(page, grid.header('name'), -DRAG_BY)

		await dragResizer(page, grid.header('name'), DRAG_BY)

		expect(await columnWidth(grid, 'name')).toBeCloseTo(before, -1)
	})

	// The other columns are fixed where they stand when the drag starts. Left filling, they would
	// take the width this one gives up, and the user would watch a neighbour's edge move.
	test('dragging one column leaves every other column where it was', async ({ grid, page }) => {
		const others = ['email', 'age', 'active'] as const
		const before = await Promise.all(others.map((id) => columnWidth(grid, id)))

		await dragResizer(page, grid.header('name'), -DRAG_BY)

		const after = await Promise.all(others.map((id) => columnWidth(grid, id)))
		after.forEach((width, index) => {
			expect(width, others[index]).toBeCloseTo(before[index] ?? 0, 0)
		})
	})

	test('stops at the column’s max', async ({ grid, page }) => {
		await dragResizer(page, grid.header('name'), -DRAG_BY)

		await dragResizer(page, grid.header('name'), DRAG_FAR)

		expect(await columnWidth(grid, 'name')).toBeCloseTo(NAME_MAX, -1)
	})

	test('stops at the column’s min', async ({ grid, page }) => {
		await dragResizer(page, grid.header('name'), -DRAG_FAR)

		expect(await columnWidth(grid, 'name')).toBeCloseTo(NAME_MIN, -1)
	})

	test('a double-click on the handle restores the width the column names', async ({ grid, page }) => {
		await dragResizer(page, grid.header('name'), -DRAG_BY)
		expect(await columnWidth(grid, 'name')).toBeLessThan(NAME_DEFAULT)

		await resizerIn(grid.header('name')).dblclick()

		expect(await columnWidth(grid, 'name')).toBeCloseTo(NAME_DEFAULT, 0)
	})

	test('a double-click on the handle of a column that names no width lets it fill again', async ({ grid, page }) => {
		const filling = await columnWidth(grid, 'email')
		await dragResizer(page, grid.header('email'), -DRAG_BY)
		expect(await columnWidth(grid, 'email')).toBeLessThan(filling)

		await resizerIn(grid.header('email')).dblclick()

		expect(await columnWidth(grid, 'email')).toBeCloseTo(filling, 0)
	})
})

/**
 * The two modes differ only mid-drag, so each is asserted at both moments: what the column is
 * doing while the pointer is down, and where it lands after it comes up. Checking only the
 * release would make the two indistinguishable — and the option pointless.
 */
test.describe("resizing.mode: 'onChange'", () => {
	test('follows the pointer while it is still down', async ({ grid, page }) => {
		await grid.open(ON_CHANGE)
		const before = await columnWidth(grid, 'name')
		let midDragWidth = 0

		await dragResizer(page, grid.header('name'), -DRAG_BY, async () => {
			midDragWidth = await columnWidth(grid, 'name')
		})

		expect(midDragWidth, 'the column did not move until the pointer was released').toBeCloseTo(before - DRAG_BY, -1)
		expect(await columnWidth(grid, 'name')).toBeCloseTo(before - DRAG_BY, -1)
	})
})

test.describe("resizing.mode: 'onEnd'", () => {
	test('holds the old width until the pointer comes up', async ({ grid, page }) => {
		await grid.open(ON_END)
		const before = await columnWidth(grid, 'name')
		let midDragWidth = 0

		await dragResizer(page, grid.header('name'), -DRAG_BY, async () => {
			midDragWidth = await columnWidth(grid, 'name')
		})

		expect(midDragWidth, 'the column moved mid-drag — that is onChange’s behaviour').toBeCloseTo(before, 0)
		// And it does land on release: the mode defers the commit, it does not drop it.
		expect(await columnWidth(grid, 'name')).toBeCloseTo(before - DRAG_BY, -1)
	})
})
