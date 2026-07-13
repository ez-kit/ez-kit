import { expect, test } from '@playwright/test'

// Fumadocs renders its docs sidebar as `<aside id="nd-sidebar">` (the `nd-` prefix is
// Fumadocs' own). It is part of the `(site)` docs chrome supplied by the Fumadocs
// `DocsLayout` — it must never appear on an isolated `(embed)` example page.
const FUMADOCS_SIDEBAR = '#nd-sidebar'

test('shadcn example page renders an isolated grid without docs chrome', async ({ page }) => {
	// Baseline: the Fumadocs sidebar provably renders on a real `(site)` docs page.
	await page.goto('/docs/data-grid/sorting')
	await expect(page.locator(FUMADOCS_SIDEBAR)).toBeVisible()

	// The isolated embed page renders the grid...
	await page.goto('/examples/shadcn/base-sorting?theme=light')
	await expect(page.locator('table')).toBeVisible()
	// ...but must NOT inherit the `(site)` Fumadocs docs chrome.
	await expect(page.locator(FUMADOCS_SIDEBAR)).toHaveCount(0)
})
