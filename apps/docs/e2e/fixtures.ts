import { test as base, expect } from '@playwright/test'

import type { Kit } from './kits'
import type { Locator, Page } from '@playwright/test'

/**
 * Fixtures for the kit-agnostic grid specs.
 *
 * A spec never names a kit: it asks for `grid`, and the Playwright project it runs under
 * decides which kit that is. What makes this possible is that `@ez-kit/data-grid-react`
 * carries no styling and emits only semantic `data-*` attributes — `data-slot`,
 * `data-column-id`, `data-sort-direction`, `data-pinned`, `data-align` — which every kit
 * inherits unchanged. Those attributes, not a kit's class names or DOM shape, are what the
 * helpers below address, so the same assertion holds for shadcn, heroui and any kit added
 * later. Reach for a kit-specific selector only to prove something *about* that kit, and
 * then say so in the test.
 */

export type GridFixture = {
	/** Opens an example's standalone embed page and waits for the grid to render. */
	open: (exampleId: string) => Promise<void>
	/** Every body row, in render order. */
	rows: () => Locator
	/** A column's header cell. */
	header: (columnId: string) => Locator
	/** A column's sort trigger — the element carrying `data-sort-direction`. */
	sortTrigger: (columnId: string) => Locator
	/** Applied sort direction for a column, as the header reports it. */
	sortDirection: (columnId: string) => Promise<string | null>
	/** Text of a column's body cells on the current page, top to bottom. */
	columnText: (columnId: string) => Promise<string[]>
	/**
	 * One body cell, by its row's position and its column's id.
	 *
	 * Async because the column's position is read from the header row — see {@link columnIndex}.
	 */
	cell: (rowIndex: number, columnId: string) => Promise<Locator>
	/**
	 * Scrolls the grid's scrollport by the given pixel deltas.
	 *
	 * Which element that is differs per kit and per axis, so the react layer resolves it and
	 * stamps it `data-scrollport="x y"` — that attribute is the one name for it.
	 */
	scrollBy: (delta: { x?: number; y?: number }) => Promise<void>
}

type WorkerOptions = { kit: Kit }
type TestFixtures = { grid: GridFixture }

/**
 * `data-row-id` is part of the react layer's row contract (`row.tsx`), so requiring it here
 * makes every spec enforce that contract for every kit: a kit whose adapter swallows the
 * attribute — heroui's `Tr` did, until it stopped consuming it in favour of passing it on —
 * fails on the first row lookup instead of quietly diverging.
 */
const BODY_ROW = '[data-slot="tbody"] [data-slot="tr"][data-row-id]'

/**
 * Body cells carry no `data-column-id` — only headers do — so a column's cells are addressed
 * by their position, resolved from that column's header. Kept here so a future attribute on
 * the cell itself is a one-line change rather than an edit to every spec.
 */
async function columnIndex(page: Page, columnId: string): Promise<number> {
	const index = await page.evaluate((id) => {
		const headers = [...document.querySelectorAll('[data-slot="thead"] [data-slot="th"]')]
		return headers.findIndex((th) => th.getAttribute('data-column-id') === id)
	}, columnId)
	expect(index, `no header cell with data-column-id="${columnId}"`).toBeGreaterThanOrEqual(0)
	return index
}

function createGrid(page: Page, kit: Kit): GridFixture {
	const header = (columnId: string) => page.locator(`[data-slot="th"][data-column-id="${columnId}"]`)
	const sortTrigger = (columnId: string) => header(columnId).locator('[data-slot="sort-trigger"]')

	return {
		open: async (exampleId) => {
			await page.goto(`/examples/${kit}/${exampleId}?theme=light`)
			await expect(page.locator('table')).toBeVisible()
		},
		rows: () => page.locator(BODY_ROW),
		header,
		sortTrigger,
		sortDirection: (columnId) => sortTrigger(columnId).getAttribute('data-sort-direction'),
		scrollBy: async ({ x = 0, y = 0 }) => {
			const axis = x !== 0 ? 'x' : 'y'
			const scrollport = page.locator(`[data-scrollport~="${axis}"]`)
			await expect(scrollport, `the grid stamps no ${axis} scrollport`).toHaveCount(1)
			await scrollport.evaluate(
				(element, [dx, dy]) => {
					element.scrollBy(dx, dy)
				},
				[x, y] as const,
			)
			// Sticky offsets are recomputed on scroll; let the frame land before measuring.
			await page.evaluate(async () => {
				await new Promise((resolve) => requestAnimationFrame(resolve))
			})
		},
		cell: async (rowIndex, columnId) => {
			const index = await columnIndex(page, columnId)
			return page.locator(BODY_ROW).nth(rowIndex).locator('[data-slot="td"]').nth(index)
		},
		columnText: async (columnId) => {
			// Wait for the body before reading it: a kit may re-mount rows while applying a new
			// sort or filter, and a read landing in that gap returns an empty array — which an
			// `expect` on the result reports as a mysterious `undefined` rather than as a race.
			await expect(page.locator(BODY_ROW).first()).toBeVisible()
			const index = await columnIndex(page, columnId)
			return page.locator(BODY_ROW).evaluateAll(
				(rows, cellIndex) =>
					rows.map((row) => {
						const cell = row.querySelectorAll('[data-slot="td"]')[cellIndex]
						return cell === undefined ? '' : cell.textContent.trim()
					}),
				index,
			)
		},
	}
}

/**
 * The element's box, or a failure naming it.
 *
 * Playwright returns `null` for an element that renders no box, and the obvious `?? 0` at the
 * call site turns that into a coordinate of zero — two missing elements then "agree" and a
 * measurement test passes while measuring nothing. This is how a sticky-footer assertion kept
 * passing after the footer stopped being sticky, so measurements go through here.
 */
export async function boxOf(locator: Locator): Promise<{ x: number; y: number; width: number; height: number }> {
	const box = await locator.boundingBox()
	if (box === null) throw new Error('the element renders no box — it is detached, hidden, or never matched')
	return box
}

/**
 * Clicks a checkbox the way a person does, whatever the kit wraps it in.
 *
 * shadcn renders the control itself (`button[role="checkbox"]`), HeroUI a visually-hidden
 * `<input>` inside a `<label>` whose styled span swallows the click — so a plain `.click()` on
 * the role element times out there. Clicking the label when there is one covers both.
 */
export async function toggle(checkbox: Locator): Promise<void> {
	await checkbox.locator('xpath=ancestor-or-self::label[1]').or(checkbox).first().click()
}

export const test = base.extend<TestFixtures, WorkerOptions>({
	// Supplied by the project (see playwright.config.ts); the default keeps a bare
	// `playwright test path/to.spec.ts` runnable without naming a project.
	kit: ['shadcn', { option: true, scope: 'worker' }],
	grid: async ({ page, kit }, use) => {
		await use(createGrid(page, kit))
	},
})

export { expect } from '@playwright/test'
