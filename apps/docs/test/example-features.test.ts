// @vitest-environment node
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import { BASE_FEATURES, REQUIRED_BY_OPTION, collectExampleSets } from './example-features/sets'

/**
 * Checks that every data-grid example registers the features its own configuration needs.
 *
 * TanStack Table v9 registers **nothing** by default: a feature left out of `features` has no state
 * slice, no table members and no row methods. That is the point of the composition model, and it is
 * also its sharpest edge, because most of the ways to get it wrong are quiet:
 *
 * - a missing **row model** is completely silent — each stage falls back to the previous one, so a
 *   set with `rowSortingFeature` and no `sortedRowModel` gives you sort headers that respond and
 *   rows that never move;
 * - a missing **`filterFns`** makes every row match, because a column's `filterFn` is the *name*
 *   `'auto'` and an unregistered name resolves to no comparator;
 * - a missing **{@link BASE_FEATURES}** member is a render-time `TypeError` that core's
 *   `REQUIRED_FEATURE` guard cannot warn about, since none of the three is asked for by a config key.
 *
 * None of that is a type error. `TableConfig` declares every option unconditionally — `TFeatures`
 * parameterises the type without gating any key on it (see `TableConfig`'s own docblock in core) —
 * so `{ features: tableFeatures({}), sorting: true }` compiles clean, and the only runtime check is
 * a development warning nothing in CI reads.
 *
 * So this is the guard for the ~70 hand-written sets in `shared/data-grid/examples/components`. It
 * compares **string literals in source**: the members inside each file's `tableFeatures({ … })` and
 * the config keys the same file writes. Both are literals a human typed, which is why comparing
 * them compares the relationship rather than approximating it — the method
 * `e2e-slots.test.ts` uses for `data-slot`, one directory over.
 *
 * What it cannot see: a set assembled at runtime rather than written as a literal, a config key
 * reached through a spread, and whether the feature actually behaves once registered. The browser
 * suite is what answers the last one.
 */
const DOCS_ROOT = fileURLToPath(new URL('..', import.meta.url))
const SETS = collectExampleSets(DOCS_ROOT)

describe('data-grid example feature sets', () => {
	it('finds the example components', () => {
		expect(SETS.filter((set) => set.buildsAGrid).length).toBeGreaterThan(60)
	})

	it('gives every grid a feature set', () => {
		const without = SETS.filter((set) => set.buildsAGrid && set.members.length === 0)

		expect(without.map((set) => set.file)).toEqual([])
	})

	it.each(BASE_FEATURES)('registers %s in every set', (feature) => {
		const missing = SETS.filter((set) => set.members.length > 0 && !set.members.includes(feature))

		expect(missing.map((set) => set.file)).toEqual([])
	})

	/**
	 * Scoped to the files that declare a set, which are the files that build a grid.
	 *
	 * The others are shared column definitions and state helpers — `production/data.ts`,
	 * `crud/columns.ts`, `production/use-orders-state.ts` — and they write config keys without
	 * building anything. The set that has to cover a column's `filtering` belongs to whichever grid
	 * renders that column, and that grid's own file is checked here.
	 */
	it.each(Object.entries(REQUIRED_BY_OPTION))('registers what `%s` needs', (option, required) => {
		const missing = SETS.flatMap((set) => {
			if (set.members.length === 0 || !set.options.includes(option)) return []
			const absent = required.filter((member) => !set.members.includes(member))

			return absent.length === 0 ? [] : [`${set.file} — ${option} needs ${absent.join(', ')}`]
		})

		expect(missing).toEqual([])
	})

	/**
	 * The one case where a feature's own row model is the wrong answer.
	 *
	 * `pagination.mode: 'infinite'` shows every accumulated row, so `paginatedRowModel` slices them
	 * back to one page. Core warns about this at construction; the warning is easy to miss in a docs
	 * page that renders in an iframe, and the first mechanical pass over these examples made exactly
	 * this mistake in all five infinite grids.
	 */
	it('leaves `paginatedRowModel` out of every infinite-scroll set', () => {
		// Keyed off `pagination.mode: 'infinite'` in the source, not off `infiniteFeature` in the set:
		// the feature is in the base set of every grid (the adapter mounts `<LoadMoreFooter />`
		// unconditionally), so its presence says nothing about whether this grid scrolls infinitely.
		const wrong = SETS.filter((set) => set.isInfinite && set.members.includes('paginatedRowModel'))

		expect(wrong.map((set) => set.file)).toEqual([])
	})
})
