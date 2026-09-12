import { boxOf, expect, test } from '../../../fixtures'

import type { Locator, Page } from '@playwright/test'

/**
 * Expanding a row, in both modes.
 *
 * The two modes differ in *what* appears: `sub-content` opens a panel below the row, `tree`
 * reveals the row's own children as rows. So each block asserts against the thing that mode
 * produces — a panel that is not a data row, or data rows that were not there before — rather
 * than against "something changed".
 *
 * The chevron is addressed by role and by the name the dictionary gives it, and that name is
 * itself the state: `expanding.expand` becomes `expanding.collapse` on the same button. That the
 * button carries no `aria-expanded` is **deliberate and settled — do not add one.** The flipping
 * label already announces the state, and the pair that would normally accompany `aria-expanded`
 * is a label that stays put, which these two dictionary keys are not. So the flipping label is
 * the only thing announcing state, and that is what the specs below check: that it flips, not
 * merely that it is there.
 */

const SUB_CONTENT = 'expanding-sub-content'
const TREE = 'expanding-tree'
const TREE_SUB_ROWS = 'expanding-tree-sub-rows'
const CONTROLLED = 'expanding-controlled'

/** `EMPLOYEES` in the sub-content example. */
const SUB_CONTENT_ROWS = 5
const ALICE_BIO = 'Full-stack engineer with 8 years'

/** The top level of `ORG_DATA` in the tree example: three departments. */
const TREE_ROOTS = 3
/** `Engineering`'s three teams. */
const ENGINEERING_CHILDREN = 3

const expandButton = (scope: Locator | Page) => scope.getByRole('button', { name: 'Expand row' })
const collapseButton = (scope: Locator | Page) => scope.getByRole('button', { name: 'Collapse row' })

/**
 * The sub-content panel.
 *
 * It is a row of the table but not a row of the data, so it carries `data-slot="tr"` — as every
 * row in the body does — and no `data-row-id`, which is what keeps it out of `grid.rows()`.
 * Both halves of this selector are deliberate, and each caught a defect: the panel used to fall
 * through to the kit's own `data-slot` default (`table-row` under shadcn), and it used to be
 * marked `data-expanded`, a name React Aria reserves and strips — so under heroui the attribute
 * never reached the DOM and both kits' `tr[data-expanded]` panel styling did nothing there.
 */
const PANEL = '[data-slot="tr"][data-expanded-row="true"]'

test.describe("expanding.mode: 'sub-content'", () => {
	test.beforeEach(async ({ grid }) => {
		await grid.open(SUB_CONTENT)
	})

	test('offers a chevron per row and opens nothing until one is pressed', async ({ grid, page }) => {
		await expect(expandButton(page)).toHaveCount(SUB_CONTENT_ROWS)
		await expect(page.locator(PANEL)).toHaveCount(0)
		await expect(grid.rows()).toHaveCount(SUB_CONTENT_ROWS)
	})

	test('opens a panel under the row it was opened on, and only there', async ({ grid, page }) => {
		await expandButton(grid.rows().first()).click()

		const panel = page.locator(PANEL)
		await expect(panel).toHaveCount(1)
		await expect(panel).toContainText(ALICE_BIO)

		// Directly under its own row, not appended to the end of the body.
		const followsItsRow = await page.locator('[data-slot="tbody"]').evaluate((body, selector) => {
			const opened = body.querySelector('[data-slot="tr"][data-row-id]')
			return opened?.nextElementSibling?.matches(selector) ?? false
		}, PANEL)
		expect(followsItsRow, 'the panel is not the element immediately after its row').toBe(true)
	})

	test('the panel is not counted as a row of the data', async ({ grid, page }) => {
		await expandButton(grid.rows().first()).click()

		await expect(page.locator(PANEL)).toHaveCount(1)
		await expect(grid.rows()).toHaveCount(SUB_CONTENT_ROWS)
	})

	test('the panel spans the full width of the table', async ({ grid, page }) => {
		await expandButton(grid.rows().first()).click()

		const rowBox = await boxOf(grid.rows().first())
		const panelBox = await boxOf(page.locator(PANEL))
		expect(Math.abs(panelBox.width - rowBox.width)).toBeLessThan(2)
	})

	test('the chevron renames itself to the action it now offers', async ({ grid }) => {
		const row = grid.rows().first()
		await expect(collapseButton(row)).toHaveCount(0)

		await expandButton(row).click()

		await expect(collapseButton(row)).toHaveCount(1)
		await expect(expandButton(row)).toHaveCount(0)
	})

	test('pressing it again closes the panel', async ({ grid, page }) => {
		const row = grid.rows().first()
		await expandButton(row).click()
		await expect(page.locator(PANEL)).toHaveCount(1)

		await collapseButton(row).click()

		await expect(page.locator(PANEL)).toHaveCount(0)
	})

	test('two rows can be open at once, each with its own panel', async ({ grid, page }) => {
		await expandButton(grid.rows().nth(0)).click()
		await expandButton(grid.rows().nth(1)).click()

		await expect(page.locator(PANEL)).toHaveCount(2)
		// Each panel carries its own row's content, not a repeat of the first.
		await expect(page.locator(PANEL).nth(0)).toContainText('alice@example.com')
		await expect(page.locator(PANEL).nth(1)).toContainText('bob@example.com')
	})
})

test.describe("expanding.mode: 'tree'", () => {
	test.beforeEach(async ({ grid }) => {
		await grid.open(TREE)
	})

	test('shows only the roots until one is opened', async ({ grid, page }) => {
		await expect(grid.rows()).toHaveCount(TREE_ROOTS)
		// No panel: a tree reveals rows, it does not open one.
		await expect(page.locator(PANEL)).toHaveCount(0)
	})

	test('opening a root reveals its children as rows of the grid', async ({ grid, page }) => {
		await expandButton(grid.rows().first()).click()

		await expect(grid.rows()).toHaveCount(TREE_ROOTS + ENGINEERING_CHILDREN)
		expect(await grid.columnText('name')).toContain('Frontend')
		await expect(page.locator(PANEL)).toHaveCount(0)
	})

	test('a revealed child reports its depth, and its parent still reports none', async ({ grid }) => {
		await expandButton(grid.rows().first()).click()

		await expect(grid.rows().nth(0)).not.toHaveAttribute('data-depth')
		await expect(grid.rows().nth(1)).toHaveAttribute('data-depth', '1')
	})

	// The chevron's own position, not the cell's box: both kits indent by padding the expand cell
	// and the one after it, and padding sits *inside* the box — so a `<td>` measurement is
	// identical at every depth and would pass with the indentation stylesheet deleted.
	test('depth is drawn, not merely declared: a child’s chevron sits right of its parent’s', async ({ grid }) => {
		await expandButton(grid.rows().first()).click()

		const parent = await boxOf(collapseButton(grid.rows().nth(0)))
		const child = await boxOf(expandButton(grid.rows().nth(1)))
		expect(child.x, 'the child row is not indented past its parent').toBeGreaterThan(parent.x)
	})

	test('a grandchild opens under its own parent, one level deeper', async ({ grid }) => {
		await expandButton(grid.rows().first()).click()
		// Row 1 is now `Frontend`, a team with two engineers under it.
		await expandButton(grid.rows().nth(1)).click()

		expect(await grid.columnText('name')).toContain('Alice Johnson')
		await expect(grid.rows().nth(2)).toHaveAttribute('data-depth', '2')
	})

	test('closing a root takes its whole subtree with it', async ({ grid }) => {
		await expandButton(grid.rows().first()).click()
		await expandButton(grid.rows().nth(1)).click()
		await expect(grid.rows()).toHaveCount(TREE_ROOTS + ENGINEERING_CHILDREN + 2)

		await collapseButton(grid.rows().first()).click()

		await expect(grid.rows()).toHaveCount(TREE_ROOTS)
	})

	test('a leaf offers no chevron at all', async ({ grid }) => {
		await expandButton(grid.rows().first()).click()
		await expandButton(grid.rows().nth(1)).click()

		// Row 2 is `Alice Johnson`, an engineer with nobody under her.
		await expect(expandButton(grid.rows().nth(2))).toHaveCount(0)
		await expect(collapseButton(grid.rows().nth(2))).toHaveCount(0)
	})
})

test.describe('expanding.getSubRows', () => {
	// The same tree over data whose children live under `reports` rather than `children`.
	test('follows the key the option names', async ({ grid }) => {
		await grid.open(TREE_SUB_ROWS)

		await expect(grid.rows()).toHaveCount(2)
		await expandButton(grid.rows().first()).click()

		expect(await grid.columnText('name')).toContain('Priya Nair')
		await expect(grid.rows().nth(1)).toHaveAttribute('data-depth', '1')
	})
})

test.describe('controlled expanding', () => {
	test.beforeEach(async ({ grid }) => {
		await grid.open(CONTROLLED)
	})

	// The example drives `state.expanded` from outside the grid; these two buttons are its own,
	// not the grid's.
	test('an outside control opens every row', async ({ grid, page }) => {
		await expect(page.locator(PANEL)).toHaveCount(0)

		await page.getByRole('button', { name: 'Expand all' }).click()

		await expect(page.locator(PANEL)).toHaveCount(await grid.rows().count())
		// The grid's own chevrons followed the state they were given.
		await expect(expandButton(page)).toHaveCount(0)
	})

	test('and closes them again', async ({ page }) => {
		await page.getByRole('button', { name: 'Expand all' }).click()
		await expect(page.locator(PANEL)).not.toHaveCount(0)

		await page.getByRole('button', { name: 'Collapse all' }).click()

		await expect(page.locator(PANEL)).toHaveCount(0)
	})

	// The controlled state is the grid's state, not a mirror of it: a chevron pressed inside the
	// grid has to reach the same store the buttons above read, or they fall out of step with it.
	test('a chevron pressed inside the grid updates the outside control', async ({ grid, page }) => {
		const collapseAll = page.getByRole('button', { name: 'Collapse all' })
		await expect(collapseAll).toBeDisabled()

		await expandButton(grid.rows().first()).click()

		await expect(collapseAll).toBeEnabled()
	})
})
