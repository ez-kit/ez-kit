import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { expect, test } from './fixtures'

import type { Page } from '@playwright/test'

/**
 * Every example is opened once per kit and has to render.
 *
 * This is the only check that runs the examples at all. A missing `registry.ts` entry throws
 * `has no registry entry for "<sourceFile>"` when the page renders and is invisible to lint,
 * typecheck and build (see AGENTS.md, "Two example conventions"); a kit-specific crash —
 * heroui dropping grouped headers, say — is equally invisible to the jsdom suites, which
 * render the React layer without either kit's real markup. Both surface here as a page that
 * never produces its root element.
 *
 * It is a barrier, not a CI job: with two kits that is nearly 300 pages against a dev server.
 * Hence the `@smoke` tag — `pnpm test:e2e` skips it, `pnpm test:e2e:smoke` runs it. Run it
 * before touching the manifest, a registry, or either kit's blocks.
 */

const docsRoot = join(dirname(fileURLToPath(import.meta.url)), '..')

type ManifestEntry = { id: string }

/** The element each product's example must produce to count as rendered. */
const PRODUCT_ROOT = {
	'data-grid': 'table',
	form: 'form',
} as const

function manifestIds(manifestPath: string): string[] {
	const entries = JSON.parse(readFileSync(join(docsRoot, manifestPath), 'utf8')) as ManifestEntry[]
	return entries.map((entry) => entry.id)
}

const EXAMPLES = [
	...manifestIds('shared/data-grid/examples/manifest.json').map((id) => ({ id, product: 'data-grid' as const })),
	...manifestIds('shared/form/examples/manifest.json').map((id) => ({ id, product: 'form' as const })),
]

/**
 * Examples whose root element only exists after an interaction, mapped to the control that
 * reveals it. Both dialog examples keep their form inside a modal, so the page legitimately
 * renders nothing but a trigger until it is pressed.
 */
const REVEALED_BY: Record<string, string> = {
	'form-dialog': 'Edit profile',
	'form-dialog-schema': 'Edit profile',
}

/**
 * Errors React reports through `console.error` rather than by throwing — a failed lazy import
 * among them — never reach `page.on('pageerror')`, so both channels are collected.
 */
function collectErrors(page: Page): string[] {
	const errors: string[] = []
	page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`))
	page.on('console', (message) => {
		if (message.type() === 'error') errors.push(`console.error: ${message.text()}`)
	})
	return errors
}

test.describe('examples', { tag: '@smoke' }, () => {
	for (const { id, product } of EXAMPLES) {
		test(`${id} renders`, async ({ page, kit }) => {
			const errors = collectErrors(page)
			await page.goto(`/examples/${kit}/${id}?theme=light`)

			const trigger = REVEALED_BY[id]
			if (trigger !== undefined) await page.getByRole('button', { name: trigger }).click()

			await expect(page.locator(PRODUCT_ROOT[product]).first()).toBeVisible()
			expect(errors, `\n${errors.join('\n')}\n`).toEqual([])
		})
	}
})
