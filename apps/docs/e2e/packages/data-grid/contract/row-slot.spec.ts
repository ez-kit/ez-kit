import { expect, test } from '../../../fixtures'

import type { Page } from '@playwright/test'

/**
 * One invariant, over every kind of row the grid can put in its body:
 *
 * **every `<tr>` inside `[data-slot="tbody"]` carries `data-slot="tr"`, and every `<td>` inside
 * one carries `data-slot="td"`.**
 *
 * This exists because the same defect has now been found three times, one instance at a time, and
 * each time by accident while testing something else. A row drawn by the shared React layer gets
 * the attribute because that layer passes it; a row drawn anywhere else — the kit's own
 * `LoadingRow`, a panel whose `<Tr>` was written without it — falls through to whatever default
 * the kit's component sets (`data-slot="table-row"` under shadcn), and silently stops matching
 * every stylesheet rule and every selector written against the documented contract.
 *
 * Found this way so far: the creating draft row (had it), the expanded sub-content panel (did
 * not), the loading skeleton (did not), and the load-more row's cell (did not — found by this
 * sweep itself, which is the point). The next one should fail here rather than wait for someone
 * to write a spec about that feature.
 *
 * The failure message names the offending element and prints its markup, so a regression reads as
 * a sentence rather than a count.
 *
 * A named slot is not a violation. The shared layer gives some body rows and cells a slot of
 * their own on purpose — `load-more-row`, `empty-state-cell` — and those are the documented
 * contract, addressed by name elsewhere in these specs. What this sweep is for is the *other*
 * case: an element the layer forgot, falling through to whatever its kit component defaults to.
 * So the rule is "carries a slot this layer owns", and the allow-lists below are that ownership
 * written down. Adding a purposeful slot means adding it here; a kit default never qualifies.
 */

/** Rows the shared layer marks as something other than a plain body row. */
const ROW_SLOTS = ['tr', 'load-more-row'] as const
/** Cells likewise: a full-width fallback cell is named for the fallback it carries. */
const CELL_SLOTS = ['td', 'empty-state-cell', 'no-results-cell', 'loading-body-cell'] as const

type Offender = { tag: string; slot: string | null; html: string }

/** Rows and cells in the body carrying no slot this layer owns. */
async function bodySlotOffenders(page: Page): Promise<Offender[]> {
	return page.evaluate(
		([rowSlots, cellSlots]) => {
			const bodies = [...document.querySelectorAll('[data-slot="tbody"]')]
			const bad: { tag: string; slot: string | null; html: string }[] = []

			for (const body of bodies) {
				for (const row of body.querySelectorAll('tr')) {
					const rowSlot = row.getAttribute('data-slot')
					if (rowSlot === null || !rowSlots.includes(rowSlot)) {
						bad.push({ tag: 'tr', slot: rowSlot, html: row.outerHTML.slice(0, 160) })
						// A row that fell through reports every one of its cells too; the row is the
						// finding, so don't drown it.
						continue
					}
					for (const cell of row.querySelectorAll(':scope > td')) {
						const cellSlot = cell.getAttribute('data-slot')
						if (cellSlot === null || !cellSlots.includes(cellSlot)) {
							bad.push({ tag: 'td', slot: cellSlot, html: cell.outerHTML.slice(0, 160) })
						}
					}
				}
			}
			return bad
		},
		[ROW_SLOTS as readonly string[], CELL_SLOTS as readonly string[]] as const,
	)
}

function describeOffenders(offenders: Offender[]): string {
	return offenders.map((o) => `<${o.tag}> has data-slot=${JSON.stringify(o.slot)} — ${o.html}`).join('\n')
}

/**
 * One example per kind of body row. Each is opened, optionally driven into the state that
 * produces its row, and then swept.
 */
const CASES: readonly { readonly id: string; readonly what: string; readonly open?: (page: Page) => Promise<void> }[] =
	[
		{ id: 'base-sorting', what: 'plain data rows' },
		{ id: 'row-pinning-initial', what: 'pinned rows' },
		{
			id: 'expanding-sub-content',
			what: 'an expanded sub-content panel',
			open: async (page) => {
				await page.getByRole('button', { name: 'Expand row' }).first().click()
				await expect(page.locator('[data-expanded-row="true"]')).toHaveCount(1)
			},
		},
		{
			id: 'expanding-tree',
			what: 'revealed tree children',
			open: async (page) => {
				await page.getByRole('button', { name: 'Expand row' }).first().click()
			},
		},
		{
			id: 'creating-pin-row',
			what: 'the pinned creating draft row',
		},
		{
			id: 'creating-row',
			what: 'the creating draft row',
			open: async (page) => {
				await page.getByRole('button', { name: '+ Add' }).click()
				await expect(page.locator('[data-creating-row]')).toHaveCount(1)
			},
		},
		{ id: 'fallbacks', what: 'the loading skeleton' },
		{
			id: 'fallbacks',
			what: 'the empty state',
			open: async (page) => {
				await page.getByRole('button', { name: 'Empty data', exact: true }).click()
				await expect(page.locator('[data-slot="empty-state-cell"]')).toHaveCount(1)
			},
		},
		{ id: 'virtualized', what: 'virtualized rows' },
		{ id: 'infinite-scroll-manual', what: 'the load-more row' },
		{ id: 'infinite-scroll-virtualized', what: 'the load-more row under virtualization' },
	]

for (const { id, what, open } of CASES) {
	test(`every row and cell in the body keeps its slot — ${what}`, async ({ grid, page }) => {
		await grid.open(id)
		if (open) await open(page)

		const offenders = await bodySlotOffenders(page)
		expect(offenders.length, `\n${describeOffenders(offenders)}\n`).toBe(0)
	})
}
