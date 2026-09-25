import { expect, test } from '../../../fixtures'

import type { Locator, Page } from '@playwright/test'

/**
 * Row grouping, driven the way a reader drives it.
 *
 * Every locator here is a `data-slot` or a role, never a pixel and never a kit's class: the two
 * kits draw a group row very differently and agree on exactly the attributes the shared react
 * package authors. The one spec runs against both through the existing project matrix.
 */

/** Seeded with one level, so the group rows are there on load. */
const SEEDED = 'grouping-basic'
/** Starts flat, with the group-by bar mounted — the regroup-from-the-menu case. */
const INTERACTIVE = 'grouping-interactive'
/** No grouping at all, a footer instead — the aggregation-without-grouping case. */
const TOTALS = 'grouping-aggregation'

const GROUP_ROW = '[data-slot="tr"][data-group-row="true"]'
const GROUP_CELL = '[data-slot="group-cell"]'
const GROUP_LABEL = '[data-slot="group-label"]'
const GROUP_COUNT = '[data-slot="group-count"]'
const AGGREGATED_CELL = '[data-aggregated-cell="true"]'
const GROUP_BY_BAR = '[data-slot="group-by-bar"]'
const GROUP_BY_CHIP = '[data-slot="group-by-chip"]'
const GROUP_BY_CHIP_LABEL = '[data-slot="group-by-chip-label"]'
const TFOOT = '[data-slot="tfoot"]'

const groupRows = (page: Page) => page.locator(GROUP_ROW)
const chips = (page: Page) => page.locator(GROUP_BY_CHIP)

/**
 * The column menu's trigger, by its accessible name — the same handle `columns/ordering.spec.ts`
 * and `columns/visibility.spec.ts` use. Neither kit stamps a slot on it, so the name is what
 * both of them agree on.
 */
const menuTrigger = (header: Locator) => header.getByRole('button', { name: 'Column options' })

/** Opens the column menu of a header and chooses an entry by its visible wording. */
async function chooseFromColumnMenu(page: Page, columnId: string, entry: string): Promise<void> {
	await menuTrigger(page.locator(`[data-slot="th"][data-column-id="${columnId}"]`)).click()
	await page.getByRole('menuitem', { name: entry }).click()
}

test.describe('a grouped grid', () => {
	test.beforeEach(async ({ grid }) => {
		await grid.open(SEEDED)
	})

	test('renders one group row per distinct value, each with a label and a count', async ({ page }) => {
		await expect(groupRows(page)).toHaveCount(3)
		await expect(page.locator(GROUP_LABEL)).toHaveText(['EMEA', 'APAC', 'AMER'])
		// Three EMEA deals, two APAC, one AMER — counted through `subRows`, never off the
		// rendered model, which is exactly what the count is there to prove.
		await expect(page.locator(GROUP_COUNT)).toHaveText(['(3)', '(2)', '(1)'])
	})

	test('announces each group row as collapsed, then expanded', async ({ page, grid }) => {
		const first = groupRows(page).first()
		await expect(first).toHaveAttribute('aria-expanded', 'false')

		const before = await grid.rows().count()
		await first.locator(GROUP_CELL).getByRole('button').click()

		await expect(first).toHaveAttribute('aria-expanded', 'true')
		expect(await grid.rows().count()).toBeGreaterThan(before)
	})

	test('collapses again', async ({ page, grid }) => {
		const first = groupRows(page).first()
		const chevron = first.locator(GROUP_CELL).getByRole('button')

		await chevron.click()
		const expanded = await grid.rows().count()
		await chevron.click()

		await expect(first).toHaveAttribute('aria-expanded', 'false')
		expect(await grid.rows().count()).toBeLessThan(expanded)
	})

	test('takes the grouped column out of the header', async ({ grid }) => {
		await expect(grid.header('region')).toHaveCount(0)
		await expect(grid.header('revenue')).toHaveCount(1)
	})

	test('shows a subtotal under the totalled column and nothing under the others', async ({ page }) => {
		const first = groupRows(page).first()

		// One aggregated cell per group row: `revenue` is the only column with an `aggregation`.
		await expect(first.locator(AGGREGATED_CELL)).toHaveCount(1)
		// `manager` is neither grouped nor aggregated, so the group row must show no manager's
		// name — one arbitrary row's datum beside a subtotal spanning two of them.
		await expect(first).not.toContainText('Ivanov')
		await expect(first).not.toContainText('Petrova')
	})
})

test.describe('regrouping from the controls', () => {
	test.beforeEach(async ({ grid }) => {
		await grid.open(INTERACTIVE)
	})

	test('starts flat, with no bar and no group rows', async ({ page }) => {
		await expect(groupRows(page)).toHaveCount(0)
		await expect(page.locator(GROUP_BY_BAR)).toHaveCount(0)
	})

	test('groups from the column menu, which raises the bar', async ({ page }) => {
		await chooseFromColumnMenu(page, 'region', 'Group by this column')

		await expect(groupRows(page)).toHaveCount(3)
		await expect(page.locator(GROUP_BY_BAR)).toHaveCount(1)
		await expect(page.locator(GROUP_BY_CHIP_LABEL)).toHaveText(['Region'])
	})

	test('adds a second level, outermost first', async ({ page }) => {
		await chooseFromColumnMenu(page, 'region', 'Group by this column')
		await chooseFromColumnMenu(page, 'manager', 'Group by this column')

		await expect(page.locator(GROUP_BY_CHIP_LABEL)).toHaveText(['Region', 'Manager'])
		await expect(chips(page).first()).toHaveAttribute('data-level', '0')
		await expect(chips(page).nth(1)).toHaveAttribute('data-level', '1')
	})

	/**
	 * `account` writes `grouping: false`, and on this example grouping is the **only** thing its
	 * column menu would have offered — no sorting, no pinning, no reordering is configured. So
	 * the column ends up with no menu entries at all, and a menu with no entries renders no
	 * trigger. Asserting the trigger's absence is therefore the stronger statement, and the one
	 * that does not quietly start passing for the wrong reason if a menu appears later.
	 */
	test('offers no column menu at all on a column that opted out of grouping', async ({ page }) => {
		const account = page.locator('[data-slot="th"][data-column-id="account"]')
		await expect(account).toHaveCount(1)

		await expect(menuTrigger(account)).toHaveCount(0)
		// The control: a groupable column on the same grid does get one.
		await expect(menuTrigger(page.locator('[data-slot="th"][data-column-id="region"]'))).toHaveCount(1)
	})

	test('reorders the levels from a chip', async ({ page }) => {
		await chooseFromColumnMenu(page, 'region', 'Group by this column')
		await chooseFromColumnMenu(page, 'manager', 'Group by this column')

		await chips(page).nth(1).getByRole('button').click()
		await page.getByRole('menuitem', { name: 'Group by this first' }).click()

		await expect(page.locator(GROUP_BY_CHIP_LABEL)).toHaveText(['Manager', 'Region'])
	})

	test('drops a level from a chip, and the bar with the last one', async ({ page }) => {
		await chooseFromColumnMenu(page, 'region', 'Group by this column')

		await chips(page).first().getByRole('button').click()
		await page.getByRole('menuitem', { name: 'Remove grouping level' }).click()

		await expect(page.locator(GROUP_BY_BAR)).toHaveCount(0)
		await expect(groupRows(page)).toHaveCount(0)
		// The column comes back the moment it stops being a level.
		await expect(page.locator('[data-slot="th"][data-column-id="region"]')).toHaveCount(1)
	})
})

test.describe('a grand total without grouping', () => {
	test('totals every aggregated column in the footer', async ({ page, grid }) => {
		await grid.open(TOTALS)

		// No grouping is registered on this example at all, which is the point: the footer total
		// comes from `rowAggregationFeature` alone.
		await expect(groupRows(page)).toHaveCount(0)
		// Formatted by the column's own `number` cell type — the total renders through the same
		// view its values do, which is why it is not a bare `188000`.
		await expect(page.locator(TFOOT)).toContainText('188,000')
		await expect(page.locator(TFOOT)).toContainText('485')
		// The column that wrote its own `footer` keeps it — the total is only a fallback.
		await expect(page.locator(TFOOT)).toContainText('Total')
	})
})
