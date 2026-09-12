import { expect, test } from '../../../fixtures'

import type { Page } from '@playwright/test'

/**
 * The save/restore pair: `parseState` seeds a grid from a stored snapshot, `extractState` and
 * `useExtractedState` read one back out.
 *
 * The example prints both — the hook's value in a `<pre>`, the one-shot snapshot in a sentence
 * below it — so a test can compare what the grid *shows* with what it would *store*. That pair
 * is the whole contract: a restore that renders the sort but reports something else, or a
 * snapshot that goes stale after an interaction, is exactly the bug this feature exists to avoid.
 */

const EXAMPLE = 'state-persistence'

/** `SAVED` in the example — what a previous session is pretending to have written. */
const RESTORED_SORT = [{ id: 'name', desc: false }]

/** The live value of `useExtractedState(table, { keys: [...] })`. */
const extracted = async (page: Page): Promise<Record<string, unknown>> =>
	JSON.parse(await page.locator('pre').innerText()) as Record<string, unknown>

/** The one-shot `extractState(table)` snapshot printed under the grid. */
const snapshot = async (page: Page): Promise<Record<string, unknown>> => {
	const text = await page.getByText('Snapshot for storage:').innerText()
	return JSON.parse(text.replace('Snapshot for storage:', '').trim()) as Record<string, unknown>
}

test.describe('restoring state from a snapshot', () => {
	test.beforeEach(async ({ grid }) => {
		await grid.open(EXAMPLE)
	})

	test('the grid opens in the saved sort', async ({ grid }) => {
		expect(await grid.sortDirection('name')).toBe('asc')
		expect(await grid.columnText('name')).toEqual(['Alice', 'Bob', 'Carol'])
	})

	test('the extracted state reports the sort the grid is rendering', async ({ page }) => {
		expect((await extracted(page)).sorting).toEqual(RESTORED_SORT)
	})

	test('it carries exactly the keys the hook was asked for', async ({ page }) => {
		// `keys: ['sorting', 'columnFilters', 'pagination']` — the point of the option is that a
		// caller stores three slices rather than the whole table state.
		expect(Object.keys(await extracted(page))).toEqual(['sorting', 'columnFilters', 'pagination'])
	})

	test('the full snapshot carries every slice, not only those three', async ({ page }) => {
		const keys = Object.keys(await snapshot(page))

		expect(keys).toEqual(expect.arrayContaining(['sorting', 'columnFilters', 'pagination']))
		// `extractState` is the "save everything" call; the hook is the filtered view of it.
		expect(keys).toEqual(expect.arrayContaining(['columnVisibility', 'columnOrder', 'columnPinning', 'columnSizing']))
	})
})

test.describe('reading state back out as it changes', () => {
	test.beforeEach(async ({ grid }) => {
		await grid.open(EXAMPLE)
	})

	test('sorting the grid updates the extracted state', async ({ grid, page }) => {
		await grid.sortTrigger('name').click()

		await expect.poll(async () => (await extracted(page)).sorting).toEqual([{ id: 'name', desc: true }])
		// And the grid is really in that order — the readout is not the only thing that moved.
		expect(await grid.columnText('name')).toEqual(['Carol', 'Bob', 'Alice'])
	})

	test('filtering updates it too, under its own key', async ({ grid, page }) => {
		await grid.header('role').getByRole('textbox').fill('Engineer')

		await expect.poll(async () => (await extracted(page)).columnFilters).toEqual([{ id: 'role', value: 'Engineer' }])
		await expect.poll(() => grid.columnText('name')).toEqual(['Alice'])
	})

	test('the one-shot snapshot is taken fresh on every render', async ({ grid, page }) => {
		await grid.sortTrigger('name').click()

		// `extractState` is called during render, so a stale snapshot here would mean the page
		// re-rendered with last render's state — the failure mode that makes a "save" button
		// store what the user saw one click ago.
		await expect.poll(async () => (await snapshot(page)).sorting).toEqual([{ id: 'name', desc: true }])
	})
})
