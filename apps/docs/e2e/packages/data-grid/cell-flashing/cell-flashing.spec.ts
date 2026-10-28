import { expect, test } from '../../../fixtures'

/**
 * Cell flashing, on the polling example: a timer moves one quote every 1.5 s and stamps every row's
 * `updatedAt`, which is the one column with `flashing: false`.
 *
 * The phases themselves are timed in `cell-flash.test.tsx`; what only a browser shows is that a
 * real grid, polled through React state, marks the cell that moved and leaves the column that
 * opted out alone.
 */

const EXAMPLE = 'cell-flashing'

/** Two polls and some slack: a tick lands well inside this. */
const WITHIN_A_TICK = 5_000

test.describe('cell flashing', () => {
	test.beforeEach(async ({ grid }) => {
		await grid.open(EXAMPLE)
	})

	test('flashes a cell whose value moved on a poll', async ({ page }) => {
		await expect(page.locator('[data-slot="td"][data-flash]').first()).toBeAttached({ timeout: WITHIN_A_TICK })
	})

	test('never flashes the column that opted out, though it changes on every poll', async ({ grid, page }) => {
		await expect(page.locator('[data-slot="td"][data-flash]').first()).toBeAttached({ timeout: WITHIN_A_TICK })

		for (let row = 0; row < 5; row++) {
			await expect(await grid.cell(row, 'updatedAt')).not.toHaveAttribute('data-flash')
		}
	})

	test('flashes a whole row on demand', async ({ grid, page }) => {
		await page.getByRole('button', { name: 'Flash ACME' }).click()

		await expect(await grid.cell(0, 'symbol')).toHaveAttribute('data-flash', /flash|fade/)
		await expect(await grid.cell(0, 'updatedAt')).toHaveAttribute('data-flash', /flash|fade/)
	})
})
