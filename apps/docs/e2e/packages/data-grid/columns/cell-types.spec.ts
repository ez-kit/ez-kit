import { expect, test } from '../../../fixtures'

/**
 * What the built-in cell types render in the **view** slot.
 *
 * A cell type is three renderers — view, input, filter — and only the first is the same
 * question in every kit: the input a kit opens for a `select` is that kit's combobox, but what
 * a `select` *displays* is the matching item's label, in every kit, or the type is broken. So
 * this spec asserts the view: the label a `badge`/`select` resolves, the `<img>` an `image`
 * builds from its config, the anchor a `link` builds from the value, and the `progressbar` a
 * `progress` exposes. Those are semantics the react layer fixes and the kit only styles.
 *
 * The one kit-shaped locator here is `[data-slot="select-cell-value"]`, which both kits stamp
 * on the select view for exactly this reason.
 */

const EXAMPLE = 'cell-types'

/** Row 0 of `PRODUCT_DATA` — the row every assertion below reads. */
const FIRST = {
	status: { value: 'active', label: 'Active' },
	category: { value: 'electronics', label: 'Electronics' },
	image: 'https://placehold.co/40x40',
	website: 'https://example.com/headphones',
	stock: 82,
}

test.describe('cell type views', () => {
	test.beforeEach(async ({ grid }) => {
		await grid.open(EXAMPLE)
	})

	test('badge renders the matching item label, not the stored value', async ({ grid }) => {
		const cell = await grid.cell(0, 'status')

		await expect(cell).toHaveText(FIRST.status.label)
		// The distinction is the whole point of `items`: the row holds `active`.
		expect(FIRST.status.label).not.toBe(FIRST.status.value)
	})

	test('every badge in the column resolves to a label from the list', async ({ grid }) => {
		const labels = await grid.columnText('status')

		expect(labels).toEqual(['Active', 'Inactive', 'Active', 'Discontinued', 'Active', 'Inactive'])
	})

	test('select renders its item label in the value slot', async ({ grid }) => {
		const cell = await grid.cell(0, 'category')

		await expect(cell.locator('[data-slot="select-cell-value"]')).toHaveText(FIRST.category.label)
	})

	test('image builds an img from the value and the config', async ({ grid }) => {
		const image = (await grid.cell(0, 'image')).locator('img')

		await expect(image).toHaveAttribute('src', FIRST.image)
		// `alt`, `width` and `height` are the type's config, not the row's data.
		await expect(image).toHaveAttribute('alt', 'Product')
		await expect(image).toHaveAttribute('width', '40')
		await expect(image).toHaveAttribute('height', '40')
	})

	test('link points the anchor at the value and labels it with the value', async ({ grid }) => {
		const anchor = (await grid.cell(0, 'website')).getByRole('link')

		await expect(anchor).toHaveAttribute('href', FIRST.website)
		await expect(anchor).toHaveText(FIRST.website)
		// No `target` configured, so the anchor stays in this tab and needs no `rel`.
		await expect(anchor).not.toHaveAttribute('target', '_blank')
	})

	test('progress exposes the value as a progressbar and prints it', async ({ grid }) => {
		const cell = await grid.cell(0, 'stock')

		// `max: 100`, so the percentage and the raw value coincide — deliberately, because a
		// progressbar that reported the raw number while the bar drew a percentage would pass
		// any check that only read one of the two.
		await expect(cell.getByRole('progressbar')).toHaveAttribute('aria-valuenow', String(FIRST.stock))
		await expect(cell).toContainText(String(FIRST.stock))
	})

	test('a lower value draws a shorter bar', async ({ grid }) => {
		// Row 3 holds 12 against row 0's 82 — the control that the bar is reading the row and
		// not a constant.
		await expect((await grid.cell(3, 'stock')).getByRole('progressbar')).toHaveAttribute('aria-valuenow', '12')
	})
})

/**
 * `date` renders through `toLocaleDateString`, and `cell.config.format` is forwarded to it.
 *
 * The rendered day is timezone-dependent (an ISO date is parsed as UTC and printed in the
 * browser's zone), so asserting a literal date here would encode the machine's clock into the
 * suite. What the option actually promises is the *shape*: `dateStyle: 'medium'` spells the
 * month, `dateStyle: 'short'` writes it in digits — and the two columns below hold the same
 * kind of value with different formats, so one page proves the config reached the formatter.
 */
test.describe('the date cell type', () => {
	test.beforeEach(async ({ grid }) => {
		await grid.open('date-cell-view')
	})

	test('medium spells the month out', async ({ grid }) => {
		const due = await grid.columnText('dueDate')

		expect(due).toHaveLength(6)
		for (const text of due) expect(text).toMatch(/^[A-Za-z]{3,}\s+\d{1,2},\s+\d{4}$/)
	})

	test('short writes the same kind of date in digits', async ({ grid }) => {
		const completed = await grid.columnText('completedAt')
		const filled = completed.filter((text) => text !== '')

		// Two of the six milestones are finished; the rest hold `undefined` and render empty.
		expect(filled).toHaveLength(2)
		for (const text of filled) expect(text).toMatch(/^\d{1,2}\/\d{1,2}\/\d{2,4}$/)
	})

	test('an empty date renders nothing rather than a placeholder', async ({ grid }) => {
		// `completedAt` is `undefined` on row 1 — the view returns null, so the cell is blank.
		await expect(await grid.cell(1, 'completedAt')).toHaveText('')
	})
})
