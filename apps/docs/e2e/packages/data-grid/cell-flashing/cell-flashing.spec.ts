import { expect, test } from '../../../fixtures'

/**
 * Cell flashing, on the polling example: a timer moves one quote every 1.5 s and stamps every row's
 * `updatedAt`, which is the one column with `flashing: false`.
 *
 * The phases themselves are timed in `cell-flash.test.tsx`; what only a browser shows is that a
 * real grid, polled through React state, marks the cell that moved — in the status its column
 * computes — and leaves the column that opted out alone.
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

	test('paints a moved price by its direction, and a column without a status in default', async ({ grid }) => {
		const prices = await Promise.all([0, 1, 2, 3, 4].map((row) => grid.cell(row, 'price')))

		let moved = -1
		await expect
			.poll(
				async () => {
					for (const [row, price] of prices.entries()) {
						if ((await price.getAttribute('data-flash')) !== null) {
							moved = row
							return price.getAttribute('data-flash-status')
						}
					}
					return null
				},
				{ timeout: WITHIN_A_TICK },
			)
			.toMatch(/^(success|error)$/)

		await expect(await grid.cell(moved, 'volume')).toHaveAttribute('data-flash-status', 'default')
	})

	test('flashes a whole row on demand', async ({ grid, page }) => {
		await page.getByRole('button', { name: 'Flash ACME' }).click()

		await expect(await grid.cell(0, 'symbol')).toHaveAttribute('data-flash', /flash|fade/)
		await expect(await grid.cell(0, 'updatedAt')).toHaveAttribute('data-flash', /flash|fade/)
	})
})

/**
 * The virtualized quotes example: 2000 rows, and each 1.5 s tick moves every third quote in turn,
 * so after three ticks every row has changed — most of them while outside the window.
 *
 * Under an installed clock, so a tick lands only when the test says: what is asserted right after
 * the scroll is the cells mounting, not a tick that happened to coincide with it. The virtualizer
 * survives the stubbed `requestAnimationFrame` — see `virtualization.spec.ts`.
 */
test.describe('cell flashing, virtualized', () => {
	const VIRTUAL_EXAMPLE = 'cell-flashing-virtualized'
	const TICK_MS = 1500
	const VIRTUAL_ROW = '[data-slot="tr"][data-virtual="row"]'
	const FLASHING = '[data-slot="td"][data-flash]'

	test('a row that changed off screen mounts without a flash; a tick then flashes it', async ({ grid, page }) => {
		await page.clock.install()
		await grid.open(VIRTUAL_EXAMPLE)
		await page.clock.runFor(3 * TICK_MS + 100)

		await page.locator('[data-scrollport~="y"]').evaluate((port) => {
			port.scrollTop = port.scrollHeight / 2
		})
		await page.clock.runFor(50)

		await expect
			.poll(() => page.locator(VIRTUAL_ROW).evaluateAll((rows) => rows.map((row) => row.getAttribute('data-row-id'))))
			.not.toContain('1')
		await expect(page.locator(FLASHING)).toHaveCount(0)

		await page.clock.runFor(TICK_MS)

		await expect(page.locator(`${FLASHING}[data-flash-status]`).first()).toBeAttached()
		const statuses = await page
			.locator(FLASHING)
			.evaluateAll((cells) => [...new Set(cells.map((cell) => cell.getAttribute('data-flash-status')))])
		expect(statuses.every((status) => status === 'success' || status === 'error')).toBe(true)
	})
})
