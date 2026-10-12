// @vitest-environment node
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

import { readAuthoredSlots, readSpecSlots, stripComments } from './e2e-slots/slot-literals'

/**
 * Guards the browser suite's locators against a slot no package renders.
 *
 * The specs address kit components by `data-slot` literal, and until this test both sides were
 * bare strings: #233 renamed `clear-filters-button` to `clear-filter-button` in all three
 * packages, touched no spec, and the stale selector matched nothing from the moment it landed —
 * red in `e2e (shadcn)` and `e2e (heroui)`, invisible everywhere a browser did not run.
 *
 * A slot is legal here if some package writes that literal onto an element. That is the whole
 * relationship: the JSX attribute is the DOM attribute the selector matches. It is a weaker
 * guarantee than `docs-option-names.test.ts` gives documented option names — this cannot say
 * *which* kit renders a slot, or whether the element is reachable in the state the spec drives
 * it to — but it is the guarantee that was missing, and it runs in `verify`, where a merge is
 * actually gated, rather than in the suite it protects.
 */

const REPO_ROOT = resolve(__dirname, '../../..')
const E2E_ROOT = resolve(__dirname, '../e2e')

/**
 * The React packages the browser suite drives — a data grid and a form, each as a shared layer
 * plus its two kits. A spec may address any kit's slots.
 */
const SLOT_AUTHORS = [
	'packages/data-grid/react/react/src',
	'packages/data-grid/react/shadcn/src',
	'packages/data-grid/react/heroui/src',
	'packages/form/react/react/src',
	'packages/form/react/shadcn/src',
	'packages/form/react/heroui/src',
].map((path) => resolve(REPO_ROOT, path))

const authored = readAuthoredSlots(SLOT_AUTHORS)
const usages = readSpecSlots(E2E_ROOT, REPO_ROOT)

describe('e2e data-slot locators', () => {
	it('addresses only slots a package writes onto an element', () => {
		const unknown = usages.filter((usage) => !authored.has(usage.slot))

		expect(unknown.map((usage) => `${usage.at}  [data-slot="${usage.slot}"]`)).toEqual([])
	})

	// Both sides are read by scanning source, so an extractor that silently stopped finding
	// anything would make the assertion above pass while checking nothing.
	it('reads both sides of the contract', () => {
		expect(usages.length).toBeGreaterThan(50)
		expect(new Set(usages.map((usage) => usage.slot)).size).toBeGreaterThan(20)
		expect(authored.size).toBeGreaterThan(100)
	})
})

describe('stripComments', () => {
	it('drops a slot named in prose but keeps the one a locator uses', () => {
		const source = ["/** HeroUI stamps data-slot='chip' itself. */", `const TH = '[data-slot="th"]'`].join('\n')

		expect(stripComments(source)).not.toContain('chip')
		expect(stripComments(source)).toContain('data-slot="th"')
	})

	it('keeps line numbers so a failure points at the right line', () => {
		const source = ['/*', ' * a block comment', ' */', `const TH = '[data-slot="th"]'`].join('\n')

		expect(stripComments(source).split('\n')).toHaveLength(4)
		expect(stripComments(source).split('\n')[3]).toContain('th')
	})

	it('does not read a URL inside a string as a line comment', () => {
		const source = `page.goto('https://example.com') // data-slot="gone"\nconst TD = '[data-slot="td"]'`

		expect(stripComments(source)).toContain('https://example.com')
		expect(stripComments(source)).not.toContain('gone')
		expect(stripComments(source)).toContain('data-slot="td"')
	})
})
