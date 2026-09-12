import { expect, test } from '../../../fixtures'

/**
 * `sorting` on the `base-sorting` example: 50 rows of `makeUsers`, paginated 10 per page,
 * columns name / email / age / active.
 *
 * Two columns are exercised because the first click does not mean the same thing on both.
 * With `sorting.descFirst` unset, the direction comes from TanStack's own inference over the
 * column's values: a string column starts ascending, a **number** column starts descending.
 * `age` is the number column here, and its values (`20 + (i % 50)`) make each direction
 * provable from the first page alone — the top row is the data set's minimum or maximum,
 * which a merely stable order can never produce.
 */

const EXAMPLE = 'base-sorting'
const NUMBER_COLUMN = 'age'
const TEXT_COLUMN = 'name'

const MIN_AGE = 20
const MAX_AGE = 69

function numbers(cells: string[]): number[] {
	return cells.map((cell) => Number(cell))
}

test.beforeEach(async ({ grid }) => {
	await grid.open(EXAMPLE)
})

test('a sortable column starts unsorted', async ({ grid }) => {
	await expect(grid.sortTrigger(NUMBER_COLUMN)).toHaveAttribute('data-sortable', 'true')
	expect(await grid.sortDirection(NUMBER_COLUMN)).toBe('none')
})

test('a text column sorts ascending first', async ({ grid }) => {
	await grid.sortTrigger(TEXT_COLUMN).click()

	expect(await grid.sortDirection(TEXT_COLUMN)).toBe('asc')
	// Compared on the trailing number rather than with a plain string sort: the names are
	// `User <n>`, and TanStack picks its `alphanumeric` comparator for a string carrying
	// digits — so the grid orders `User 2` before `User 10`, where `Array#sort` would not.
	const order = (await grid.columnText(TEXT_COLUMN)).map((name) => Number(name.replace(/\D+/gu, '')))
	expect(order).toEqual([...order].sort((a, b) => a - b))
	expect(order[0]).toBe(1)
})

test('a number column sorts descending first', async ({ grid }) => {
	await grid.sortTrigger(NUMBER_COLUMN).click()

	expect(await grid.sortDirection(NUMBER_COLUMN)).toBe('desc')
	const values = numbers(await grid.columnText(NUMBER_COLUMN))
	expect(values).toEqual([...values].sort((a, b) => b - a))
	expect(values[0]).toBe(MAX_AGE)
})

test('the second click reverses the direction', async ({ grid }) => {
	await grid.sortTrigger(NUMBER_COLUMN).click()
	await grid.sortTrigger(NUMBER_COLUMN).click()

	expect(await grid.sortDirection(NUMBER_COLUMN)).toBe('asc')
	const values = numbers(await grid.columnText(NUMBER_COLUMN))
	expect(values).toEqual([...values].sort((a, b) => a - b))
	expect(values[0]).toBe(MIN_AGE)
})

test('sorting one column releases the other', async ({ grid }) => {
	await grid.sortTrigger(NUMBER_COLUMN).click()
	await grid.sortTrigger(TEXT_COLUMN).click()

	expect(await grid.sortDirection(TEXT_COLUMN)).toBe('asc')
	expect(await grid.sortDirection(NUMBER_COLUMN)).toBe('none')
})

test('sorting keeps the page size', async ({ grid }) => {
	const before = await grid.rows().count()
	await grid.sortTrigger(NUMBER_COLUMN).click()

	await expect(grid.rows()).toHaveCount(before)
})
