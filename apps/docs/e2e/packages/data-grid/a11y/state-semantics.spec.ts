import { expect, test, toggle } from '../../../fixtures'

/**
 * Layer B of the #227 audit, in a real browser, for both kits: what the accessibility tree is
 * told about sorting, selection and how many rows there are.
 *
 * None of this is an axe rule — axe checks that an attribute is *allowed*, never that it is
 * *there* — so `names.spec.ts` cannot cover it and a unit test cannot either. The package's own
 * `aria-state.test.tsx` asserts that the shared layer writes these attributes; what only a
 * browser can answer is whether they **survive the kit**. That is a live question for heroui,
 * whose table is React Aria's: RAC components build their own prop bag and spread it after the
 * one they were handed, which is how `data-selected` is lost there (see `row.tsx`) and how
 * issue #223 happens. If RAC ever starts authoring one of these, this file is where it shows up.
 */

/** A grid with sorting, selection, filtering and pagination all on — where every case below has something to read. */
const EXAMPLE = 'base-full'

/** A tree grid: `base-full` sorts, selects and pages, but nothing in it expands. */
const TREE = 'expanding-tree'

test('the sorted column reports its direction, and the others report that they sort', async ({ grid }) => {
	await grid.open(EXAMPLE)

	const header = grid.header('name')
	await expect(header).toHaveAttribute('aria-sort', 'none')

	await grid.sortTrigger('name').click()
	await expect(header).toHaveAttribute('aria-sort', 'ascending')

	await grid.sortTrigger('name').click()
	await expect(header).toHaveAttribute('aria-sort', 'descending')
})

test('a row reports whether it is selected, and the change is announced on the row itself', async ({ grid }) => {
	await grid.open(EXAMPLE)

	const firstRow = grid.rows().first()
	await expect(firstRow).toHaveAttribute('aria-selected', 'false')

	// `toggle`, not `click`: heroui's is a visually hidden `<input>` behind a styled span, so the
	// thing a person clicks is the label around it. The fixture knows the difference.
	await toggle(firstRow.getByRole('checkbox').first())
	await expect(firstRow).toHaveAttribute('aria-selected', 'true')
})

test('an expandable row reports whether it is open', async ({ grid }) => {
	await grid.open(TREE)

	const first = grid.rows().first()
	await expect(first).toHaveAttribute('aria-expanded', 'false')

	// Addressed by the name the dictionary gives the chevron, as `expanding.spec.ts` does — the
	// button's label says what pressing it *does*, while the attribute under test says what the
	// row currently *is*. Both are needed, and only the browser can say whether the second one
	// survives React Aria's `filterDOMProps` in the heroui kit.
	await first.getByRole('button', { name: 'Expand row' }).click()
	await expect(first).toHaveAttribute('aria-expanded', 'true')
})

test('a grid whose rows do not expand says nothing about expansion', async ({ grid }) => {
	await grid.open(EXAMPLE)

	// `false` would mean "expandable, currently closed", which would announce this flat grid as a
	// tree — the same reasoning that keeps `aria-sort='none'` off an unsortable column.
	await expect(grid.rows().first()).not.toHaveAttribute('aria-expanded', /.*/)
})

test('the table reports the whole row set, not the page in the DOM', async ({ grid, page }) => {
	await grid.open(EXAMPLE)

	const table = page.locator('[data-slot="table"]')
	const rowCount = Number(await table.getAttribute('aria-rowcount'))
	const renderedRows = await grid.rows().count()

	// A paginated grid: more rows in the set than on the page, and the count includes the
	// header row ARIA counts.
	expect(rowCount).toBeGreaterThan(renderedRows)

	// Asserted as a relationship rather than against a literal: `aria-rowindex` counts the grid's
	// header rows, and how many `<tr>`s those become is a kit's business — heroui renders a header
	// row as a fragment, because React Aria's `Column`s *are* the row.
	const first = Number(await grid.rows().nth(0).getAttribute('aria-rowindex'))
	const second = Number(await grid.rows().nth(1).getAttribute('aria-rowindex'))

	expect(first).toBeGreaterThan(0)
	expect(second).toBe(first + 1)
	expect(rowCount).toBeGreaterThanOrEqual(first + renderedRows - 1)
})

test('the grid has a live region that reports the size of the result set', async ({ grid, page }) => {
	await grid.open(EXAMPLE)

	const status = page.locator('[role="status"][aria-live="polite"]')
	await expect(status).toHaveCount(1)
	await expect(status).not.toBeEmpty()
})
