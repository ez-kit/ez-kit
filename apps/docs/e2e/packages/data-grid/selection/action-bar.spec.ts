import { expect, test, toggle } from '../../../fixtures'

import type { GridFixture } from '../../../fixtures'
import type { Locator, Page } from '@playwright/test'

/**
 * The one action bar, with both of its sections up at once.
 *
 * This is the regression the merge was for. The bar used to be two components — a selection one
 * and a draft one — each drawing its own sticky anchor and surface, kept apart by a `return null`
 * in the selection bar that only re-ran when `rowSelection` changed. A sort is a draft edit and
 * changes no `rowSelection`, so the gate never ran and both bars mounted at the same position,
 * overlapping. Nothing caught it: each bar's own spec drove one feature at a time.
 *
 * Hence the shape of this file — it drives **both** features in one grid, which is the only state
 * either defect shows up in. `selection.spec.ts` still covers the selection section on its own.
 */

/** The one example with `draft`, `selection` and `deleting.bulk` on the same grid. */
const EXAMPLE = 'production-deferred-apply'

/**
 * `data-state`, not presence: under the default `floating` variant shadcn keeps the bar mounted
 * and animates it out, HeroUI unmounts it. Both stamp `open` only while there is something to
 * act on, so that is the one question both kits answer the same way.
 */
const BAR = '[data-slot="action-bar"][data-state="open"]'
const SELECTION_SECTION = '[data-slot="action-bar-selection"]'
const DRAFT_SECTION = '[data-slot="action-bar-draft"]'

/** The column this spec sorts on to make the draft dirty — a plain text column. */
const SORT_COLUMN = 'customer'
/** The column whose values identify a row, for asserting *which* rows a bulk delete took. */
const ID_COLUMN = 'reference'

const rowCheckboxes = (page: Page) => page.locator('[data-slot="tbody"]').getByRole('checkbox')
const deleteButton = (scope: Locator | Page) => scope.getByRole('button', { name: 'Delete', exact: true })

/** `alertdialog`, for the reason `deleting.spec.ts` sets out at length. */
const confirmation = (page: Page) => page.getByRole('alertdialog')

/**
 * Selects the first two rows and stages a sort, leaving the grid in the state this file is about:
 * a live selection and a dirty draft. Returns the two rows' ids, read *before* anything is
 * deleted — the sort is deferred, so the visible order does not move under us.
 */
async function selectTwoAndStageASort(page: Page, grid: GridFixture): Promise<string[]> {
	await expect(grid.rows().first()).toBeVisible()
	const references = (await grid.columnText(ID_COLUMN)).slice(0, 2)

	await toggle(rowCheckboxes(page).first())
	await toggle(rowCheckboxes(page).nth(1))
	await expect(page.locator(BAR)).toHaveCount(1)

	await grid.sortTrigger(SORT_COLUMN).click()

	return references
}

test.describe('a selection and a pending draft at once', () => {
	test.beforeEach(async ({ grid }) => {
		await grid.open(EXAMPLE)
	})

	test('is one bar carrying both sections', async ({ grid, page }) => {
		await selectTwoAndStageASort(page, grid)

		// The count is the assertion: two overlapping bars is what this used to be, and both of
		// them matched `[data-slot="action-bar"]` once the slots were renamed.
		await expect(page.locator(BAR)).toHaveCount(1)
		await expect(page.locator(BAR).locator(SELECTION_SECTION)).toHaveCount(1)
		await expect(page.locator(BAR).locator(DRAFT_SECTION)).toHaveCount(1)
		await expect(page.locator(BAR)).toHaveAttribute('data-selected-count', '2')
		await expect(page.locator(BAR)).toHaveAttribute('data-pending-sorting', '1')
	})

	test('keeps the bulk Delete live and acting on the selected rows', async ({ grid, page }) => {
		const [first, second] = await selectTwoAndStageASort(page, grid)

		// Live, not merely present: the selection is valid against the *applied* query, which is
		// what the user is looking at. The draft only invalidates it once applied, and
		// `draft.apply()` clears the selection in the same state change.
		const bulkDelete = deleteButton(page.locator(BAR))
		await expect(bulkDelete).toBeEnabled()
		await bulkDelete.click()

		const dialog = confirmation(page)
		await expect(dialog).toHaveCount(1)
		await deleteButton(dialog).click()

		await expect(async () => {
			expect(await grid.columnText(ID_COLUMN)).not.toContain(first)
		}).toPass()
		expect(await grid.columnText(ID_COLUMN)).not.toContain(second)

		// The draft is untouched by a bulk delete, so the bar stays up on its draft section alone
		// — with nothing selected. Which sections a zero count leaves showing differs by kit, so
		// the count is read off the root both kits stamp.
		await expect(page.locator(BAR)).toHaveCount(1)
		await expect(page.locator(BAR).locator(DRAFT_SECTION)).toHaveCount(1)
		await expect(page.locator(BAR)).toHaveAttribute('data-selected-count', '0')
	})
})

/**
 * The draft section's two forms.
 *
 * On screen it is a glyph and a number per axis, because it shares one bar with the selection.
 * The words are in `messages.draft.summary`, used twice — the section's `aria-label`, and the
 * tooltip over the counts — so the short form never has to carry them.
 *
 * The tooltip half lives here rather than in a kit's unit tests on purpose: both kits portal the
 * overlay and open it on a pointer transition through react-aria / Radix timers, neither of which
 * jsdom drives faithfully. What a unit test *can* prove — that the slot is read and handed the
 * summary, and that the trigger adds no tab stop — it already does, in both kits.
 */
test.describe('the draft section', () => {
	test.beforeEach(async ({ grid }) => {
		await grid.open(EXAMPLE)
	})

	test('says in its name what the counts say in glyphs', async ({ grid, page }) => {
		await expect(grid.rows().first()).toBeVisible()
		await grid.sortTrigger(SORT_COLUMN).click()

		const draft = page.locator(BAR).locator(DRAFT_SECTION)
		await expect(draft).toHaveAttribute('aria-label', 'Unapplied: 1 sort')

		// One pill, carrying the count and no words. `globalFilter` is absent rather than zero.
		const parts = draft.locator('[data-slot="action-bar-draft-part"]')
		await expect(parts).toHaveCount(1)
		await expect(parts).toHaveAttribute('data-axis', 'sorting')
		await expect(parts).toHaveText('1')
	})

	test('opens a tooltip carrying the same long form', async ({ grid, page }) => {
		await expect(grid.rows().first()).toBeVisible()
		await grid.sortTrigger(SORT_COLUMN).click()

		const draft = page.locator(BAR).locator(DRAFT_SECTION)
		await expect(draft).toHaveAttribute('aria-label', 'Unapplied: 1 sort')

		// `role='tooltip'` rather than a slot: the two kits name the overlay differently
		// (`data-slot='tooltip-content'` in shadcn, a bare `.tooltip` in heroui), and the role is
		// what both owe. Asserting a kit's own slot here passes on one kit and matches nothing on
		// the other, which is the failure mode `e2e-slots.test.ts` cannot catch for an overlay.
		const tooltip = page.getByRole('tooltip')
		await expect(tooltip).toHaveCount(0)

		// Park the pointer away first: both kits open on a pointer *transition*, so hovering a
		// spot the mouse already occupies fires nothing and looks exactly like a broken tooltip.
		await page.mouse.move(0, 0)
		await draft.locator('[data-slot="action-bar-draft-part"]').first().hover()

		await expect(tooltip).toHaveText('Unapplied: 1 sort')
	})

	test('adds no tab stop between the counts and Reset', async ({ grid, page }) => {
		await expect(grid.rows().first()).toBeVisible()
		await grid.sortTrigger(SORT_COLUMN).click()

		const draft = page.locator(BAR).locator(DRAFT_SECTION)
		await expect(draft).toHaveCount(1)

		// The counts are a readout. HeroUI's tooltip trigger is focusable by default, so without
		// the kit's override this finds `Unapplied 1` standing in the tab order ahead of Reset.
		const focusable = draft.locator('a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])')
		await expect(focusable).toHaveText([/Reset/, /Apply/])
	})
})
