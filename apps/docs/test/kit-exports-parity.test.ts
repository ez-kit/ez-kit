// @vitest-environment node
import { describe, expect, it } from 'vitest'

import { kitExports } from './kit-exports-parity/exports-of'

/**
 * The two form kits must export the same names, values and types alike.
 *
 * Behaviour parity is the e2e suite's job — every form spec runs against both kits. What it cannot
 * see is a name one kit exports and the other does not: an example written against shadcn and
 * copied into a HeroUI app fails to compile, and nothing in either kit's own suite notices. The
 * first divergence found was in types only (`ArrayFieldScope`, `ArrayItemScope`, `ArrayNode`).
 *
 * A legitimate difference goes in `ONLY_IN`, with the reason. There is none today.
 *
 * The kits' React peer ranges do differ (`>=18` shadcn, `>=19` heroui, because HeroUI v3 requires
 * 19), but that is a manifest difference, not an export one.
 */
const ONLY_IN: Record<'shadcn' | 'heroui', Record<string, string>> = { shadcn: {}, heroui: {} }

function without(names: readonly string[], allowed: Record<string, string>): string[] {
	return names.filter((name) => !Object.hasOwn(allowed, name))
}

describe('form kit exports', () => {
	const shadcn = kitExports('@ez-kit/form-shadcn')
	const heroui = kitExports('@ez-kit/form-heroui')

	it('resolves a non-trivial surface from both kits', () => {
		expect(shadcn.values).toContain('useForm')
		expect(heroui.values).toContain('useForm')
	})

	it('exports the same values', () => {
		expect(without(shadcn.values, ONLY_IN.shadcn)).toEqual(without(heroui.values, ONLY_IN.heroui))
	})

	it('exports the same types', () => {
		expect(without(shadcn.types, ONLY_IN.shadcn)).toEqual(without(heroui.types, ONLY_IN.heroui))
	})
})
