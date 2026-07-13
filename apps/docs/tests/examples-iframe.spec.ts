import { expect, test } from '@playwright/test'

import type { Page } from '@playwright/test'

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

// shadcn's global.css (packages/data-grid/react/shadcn/src/global.css:88) defines `--sidebar`
// on `:root` as one of its shadcn/ui theme tokens; heroui's global.css defines no `--sidebar`
// token at all. (`--color-surface`, heroui's own `@theme inline` token, was tried first but
// Tailwind v4 does not emit `@theme inline` declarations as runtime `:root` custom properties,
// so it is always empty regardless of which kit loaded — confirmed empirically via a computed-style
// dump on both embed pages before picking this token.) Read the value function-style (not a bare
// property access) so it stays self-verifying if either stylesheet changes.
async function readSidebarToken(page: Page): Promise<string> {
	return page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--sidebar').trim())
}

test('shadcn example defines the --sidebar token (baseline for the heroui isolation check)', async ({ page }) => {
	await page.goto('/examples/shadcn/base-sorting?theme=light')
	await expect(page.locator('table')).toBeVisible()
	expect(await readSidebarToken(page)).not.toBe('')
})

test('heroui example renders in isolation, without shadcn tokens bleeding in', async ({ page }) => {
	await page.goto('/examples/heroui/base-sorting?theme=light')
	await expect(page.locator('table')).toBeVisible()
	// Absence of shadcn's `--sidebar` token proves the heroui stylesheet loaded in isolation,
	// with no shadcn :root bleed — a regression that reintroduces shadcn.css here would fail this.
	expect(await readSidebarToken(page)).toBe('')
})

test('embed page reports its content height to the parent', async ({ page }) => {
	await page.goto('/')
	const height = await page.evaluate(async () => {
		type MessageData = { type: string; height?: number }
		return await new Promise<number>((resolve, reject) => {
			const timeout = setTimeout(() => {
				reject(new Error('Timeout waiting for frame height'))
			}, 15000)
			const handleMessage = (e: MessageEvent<MessageData>) => {
				if (e.data.type === 'ez-frame-height' && e.data.height && e.data.height > 0) {
					clearTimeout(timeout)
					window.removeEventListener('message', handleMessage)
					resolve(e.data.height)
				}
			}
			window.addEventListener('message', handleMessage as unknown as EventListener)
			const f = document.createElement('iframe')
			f.src = window.location.origin + '/examples/shadcn/base-sorting?theme=light'
			document.body.appendChild(f)
		})
	})
	expect(height).toBeGreaterThan(0)
})
