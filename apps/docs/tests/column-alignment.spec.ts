import { expect, test } from '@playwright/test'

import type { Page } from '@playwright/test'

/**
 * Column `align` has to be verified in a real browser, which is why this lives here and not in
 * either package's jsdom suite: the attribute is not the behaviour. `data-align="end"` was
 * emitted correctly on every `<td>` for the whole time the option did nothing in the shadcn kit
 * — the structural sheet aligned with `text-align`, shadcn's `<TableCell>` is
 * `flex items-center`, and a flex container's anonymous text item is placed by
 * `justify-content`, which nothing set. jsdom computes no layout, so every existing assertion
 * (they check the attribute) passed throughout.
 *
 * So these measure where the glyphs actually land, via a `Range` over the cell's contents —
 * the cell's own box is full-width either way and proves nothing.
 *
 * Both kits are checked because the defect was kit-specific in a way that is invisible from the
 * shared layer: heroui's `<Td>` is a block box, so `text-align` alone always worked there.
 */

const EXAMPLE = 'column-footers'

type Gaps = { leftGap: number; rightGap: number }

/** Distance from the cell's padding box to the left and right edges of its rendered text. */
async function textGaps(page: Page, selector: string): Promise<Gaps[]> {
	return page.evaluate((sel) => {
		return [...document.querySelectorAll(sel)]
			.filter((el) => el.textContent.trim() !== '')
			.map((el) => {
				const cell = el.getBoundingClientRect()
				const range = document.createRange()
				range.selectNodeContents(el)
				const text = range.getBoundingClientRect()
				return { leftGap: text.left - cell.left, rightGap: cell.right - text.right }
			})
	}, selector)
}

for (const kit of ['shadcn', 'heroui'] as const) {
	test(`${kit}: align 'end' moves the text of body and footer cells, not just the header`, async ({ page }) => {
		await page.goto(`/examples/${kit}/${EXAMPLE}?theme=light`)
		await expect(page.locator('table')).toBeVisible()

		const aligned = await textGaps(page, "[data-slot='td'][data-align='end']")
		// The example has an `align: 'end'` column with body rows and a footer total.
		expect(aligned.length).toBeGreaterThan(1)
		for (const { leftGap, rightGap } of aligned) {
			// Right-aligned: the text sits against the cell's right padding edge, so the slack is
			// all on the left. Compared rather than measured against a fixed number, because the
			// two kits pad their cells differently (8px vs 16px).
			expect(rightGap).toBeLessThan(leftGap)
		}

		// Baseline: a column with no `align` is unmoved, so the assertion above is about `align`
		// and not about something that right-aligns every cell in the table.
		const unaligned = await textGaps(page, "[data-slot='td']:not([data-align])")
		expect(unaligned.length).toBeGreaterThan(0)
		for (const { leftGap, rightGap } of unaligned) {
			expect(leftGap).toBeLessThan(rightGap)
		}
	})

	test(`${kit}: align 'end' reaches the footer cell specifically`, async ({ page }) => {
		await page.goto(`/examples/${kit}/${EXAMPLE}?theme=light`)
		await expect(page.locator('table')).toBeVisible()

		// Called out on its own because the footer is a separate render path (`footer-cell.tsx`,
		// which re-emits `data-slot="td"` with `align.footer`) inside a `<tfoot>` each kit lays
		// out its own way — a fix applied to the body alone would pass the test above.
		const [footer, ...rest] = await textGaps(page, "[data-slot='tfoot'] [data-slot='td'][data-align='end']")
		expect(rest).toHaveLength(0)
		expect(footer).toBeDefined()
		expect(footer?.rightGap).toBeLessThan(footer?.leftGap ?? 0)
	})
}
