import AxeBuilder from '@axe-core/playwright'

import { expect, test } from '../../../fixtures'

import type { Page } from '@playwright/test'

/**
 * The accessible-name defects from the #227 audit, asserted in a real browser for both kits.
 *
 * Deliberately **rule-scoped** rather than a whole-page axe run. Three of the rules below were
 * reported in both kits and are fixed in `@ez-kit/data-grid-react`, so they belong to the shared
 * contract every kit inherits — and a rule-scoped run says which defect regressed instead of
 * handing back a page's worth of findings. It also keeps the bare `(embed)/examples` route out of
 * it: `document-title`, `landmark-one-main`, `region` and `page-has-heading-one` are artefacts of
 * a page with no chrome, not of the grid.
 *
 * What this does **not** cover, so nobody reads a green run as more than it is:
 *
 * - `color-contrast` — heroui's header sort trigger is below AA. It is a value in that kit's
 *   stylesheet, it needs a design decision rather than a fix, and it cannot be judged in a
 *   rule-scoped run of the shared contract.
 * - The state semantics (`aria-sort`, `aria-selected`, `aria-rowcount`, live regions) and the
 *   focus model. Neither is an axe rule, and neither is fixed yet — see #227's layers B and C.
 */

/** The rules this file is the guard for. Each one was a real violation before the fix. */
const RULES = [
	// The filter inputs carried a placeholder and no name. Both kits.
	'label',
	// The `__actions__` / `__expand__` system columns rendered an empty `<th>`. Both kits.
	'empty-table-header',
	// shadcn's page-size trigger, named by its own current value and nothing else.
	'button-name',
	// The sort affordance used to be a `role="button"` div wrapping the indicator's button, and
	// heroui's sort / visibility triggers put a real `<Button>` inside a `Popover.Trigger`, which
	// renders a `div[role="button"]` of its own.
	'nested-interactive',
] as const

/**
 * Examples chosen for what they put on the page, not for coverage: a grid with every feature on,
 * one with the expand column, and one with filters over several cell types — which is what the
 * four rules above can actually fire on.
 */
const EXAMPLES = ['base-full', 'base-filtering', 'expanding-sub-content', 'production-orders'] as const

async function violations(page: Page) {
	const result = await new AxeBuilder({ page }).withRules([...RULES]).analyze()
	return result.violations.map((violation) => ({
		id: violation.id,
		nodes: violation.nodes.map((node) => node.target.join(' ')),
	}))
}

for (const example of EXAMPLES) {
	test(`${example} names every control and header cell`, async ({ page, grid }) => {
		await grid.open(example)

		expect(await violations(page)).toEqual([])
	})
}
