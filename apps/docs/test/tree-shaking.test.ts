// @vitest-environment node
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

import { bundledCodeOf, entryPointsPulledBy } from './tree-shaking/bundle'

/**
 * Guards what a consumer's bundler actually pulls in when it imports one thing from a package.
 *
 * The packages are ESM and declare `sideEffects: false`, which is necessary for tree shaking and
 * nowhere near sufficient: a single top-level call or property read that a bundler cannot prove
 * pure anchors everything behind it. `zu-store` and `va-store` both did exactly that — their
 * default cache was built with a bare `createStoreCache()` and destructured — so an app importing
 * only `createContextStore` carried the whole `store-core/cache` graph, about 2 KB gzipped, for a
 * cache it never mounted. Nothing failed: the packages built, the types were right, and
 * `size-limit` measures whole entry points rather than what a partial import drags along.
 *
 * Each case states the **complete** set of entry points its imports may reach, so anything newly
 * pulled in fails here rather than in someone's bundle — a forbidden-list would only catch the
 * regressions we already thought of. The sets are read against `everything`, which pulls the whole
 * surface: that is what makes an absence meaningful rather than an artifact of a build that
 * resolved nothing.
 *
 * To add a case, name the export and run the test; the failure prints the set to record. The
 * export name is checked for free — esbuild fails the bundle outright on one the entry lacks.
 */

const REPO_ROOT = resolve(__dirname, '../../..')

const entryOf = (directory: string) => resolve(REPO_ROOT, 'packages', directory, 'dist/index.js')

/** A package's built **subpath** entry — `entryOf` reaches only the root one. */
const subpathEntryOf = (directory: string, subpath: string) =>
	resolve(REPO_ROOT, 'packages', directory, 'dist', subpath)

type Package = {
	name: string
	entry: string
	/** Entry points only the full surface reaches. Each is one a narrow case proves it can drop. */
	shakeable: readonly string[]
	cases: readonly { imports: readonly string[]; pulls: readonly string[] }[]
}

const PACKAGES: readonly Package[] = [
	{
		name: '@ez-kit/zu-store',
		entry: entryOf('zu-store'),
		shakeable: ['@ez-kit/store-core/cache', '@ez-kit/store-core/history', '@ez-kit/store-persist'],
		cases: [
			{ imports: ['createContextStore'], pulls: ['@ez-kit/store-core', '@ez-kit/zu-store'] },
			{ imports: ['useStoreState'], pulls: ['@ez-kit/zu-store'] },
			{
				imports: ['createCachedStore'],
				pulls: ['@ez-kit/store-core', '@ez-kit/store-core/cache', '@ez-kit/zu-store'],
			},
		],
	},
	{
		name: '@ez-kit/va-store',
		entry: entryOf('va-store'),
		shakeable: ['@ez-kit/store-core/cache', '@ez-kit/store-core/history', '@ez-kit/store-persist'],
		cases: [
			{ imports: ['createContextStore'], pulls: ['@ez-kit/store-core', '@ez-kit/va-store'] },
			{
				imports: ['createCachedStore'],
				pulls: ['@ez-kit/store-core', '@ez-kit/store-core/cache', '@ez-kit/va-store'],
			},
		],
	},
	/**
	 * The data-grid subpath entries.
	 *
	 * Unlike the store packages, these are read from their **own** built entry rather than from
	 * the package root, because the root is the thing they exist to avoid. `dist/index.js` is one
	 * pre-bundled file and a bundler shakes nothing out of it: importing `extractState` from `.`
	 * measured 54 857 bytes gzipped against 54 873 for the whole `DataGrid`. Through these entries
	 * the same imports cost 366, 610, 90 and 750 bytes. What the cases below hold is that each
	 * entry stays clear of the graph the root drags in — `@tanstack/table-core` above all, which
	 * arrives through `@ez-kit/data-grid-core` and is most of the difference.
	 *
	 * The root entry is listed first and on purpose: a subpath's set is only meaningful against
	 * something that *does* reach `@ez-kit/data-grid-core`, from the same package and measured the
	 * same way. Without it four near-empty sets would be equally satisfied by a harness that
	 * resolved nothing — the role `shakeable` plays for the store packages, which these entries
	 * cannot borrow because their narrow case and their whole surface reach the same place.
	 */
	{
		name: '@ez-kit/data-grid-react',
		entry: entryOf('data-grid/react/react'),
		shakeable: [],
		cases: [{ imports: ['DataGrid'], pulls: ['@ez-kit/data-grid-core', '@ez-kit/data-grid-react'] }],
	},
	{
		name: '@ez-kit/data-grid-react/state',
		entry: subpathEntryOf('data-grid/react/react', 'state/index.js'),
		shakeable: [],
		cases: [{ imports: ['extractState', 'parseState'], pulls: ['@ez-kit/data-grid-react'] }],
	},
	{
		name: '@ez-kit/data-grid-react/contract',
		entry: subpathEntryOf('data-grid/react/react', 'contract.js'),
		shakeable: [],
		cases: [{ imports: ['GridFeature', 'FEATURE_COMPONENTS'], pulls: ['@ez-kit/data-grid-react'] }],
	},
	{
		name: '@ez-kit/data-grid-react/menu',
		entry: subpathEntryOf('data-grid/react/react', 'menu.js'),
		shakeable: [],
		cases: [{ imports: ['toMenuSections'], pulls: ['@ez-kit/data-grid-react'] }],
	},
	{
		name: '@ez-kit/data-grid-react/cell-types',
		entry: subpathEntryOf('data-grid/react/react', 'cell-types/index.js'),
		shakeable: [],
		cases: [{ imports: ['formatNumber', 'truncateText'], pulls: ['@ez-kit/data-grid-react'] }],
	},
	/**
	 * `./kit` is the entry the kits' own blocks import, and the one that made splitting them worth
	 * doing. Nearly every block imported `useGridMessages` from the adapter root, which anchored all
	 * ~187 kB of it into any bundle that reached that block: a kit's `textCellType` alone bundled to
	 * ~200 kB. Through this entry the same primitives cost 3 729 bytes gzipped.
	 *
	 * So what this case guards is not a number but a rule — `./kit` must stay clear of the root.
	 * Reaching `@ez-kit/data-grid-react` here would mean a value was added to `kit.ts` that drags the
	 * compound back in, and every block in both kits would silently pay for it again.
	 */
	{
		name: '@ez-kit/data-grid-react/kit',
		entry: subpathEntryOf('data-grid/react/react', 'kit.js'),
		shakeable: [],
		cases: [
			{
				imports: ['useGridMessages', 'PAGE_GAP', 'ActionBarVariant'],
				pulls: ['@ez-kit/data-grid-core', '@ez-kit/data-grid-react'],
			},
		],
	},
	/**
	 * The heroui kit's per-cell-type entries.
	 *
	 * `./cell-types` is the nine-type barrel and stays the default; each type also builds on its own,
	 * because the barrel is one bundled file and a bundler does not shake a type out of it. Measured
	 * before the per-type entries existed, `textCellType` and `dateCellType` imported from the barrel
	 * cost 79 863 and 79 860 bytes gzipped — three bytes apart, which is what one indivisible unit
	 * looks like. Through their own entries: text 25 356, date 94 710 (the date picker), barrel
	 * 135 047.
	 *
	 * Only the heroui kit is listed. `@ez-kit/data-grid-shadcn` is `private` and ships as a registry
	 * item rather than an npm package, so a consumer copies its source and their own bundler sees the
	 * modules directly — there is no published `dist` for this harness to measure.
	 */
	{
		name: '@ez-kit/data-grid-heroui/cell-types/text',
		entry: subpathEntryOf('data-grid/react/heroui', 'cell-types/text.js'),
		shakeable: [],
		cases: [
			{
				// Note what is absent: `@ez-kit/data-grid-core`, and with it `@tanstack/table-core`. A
				// text cell renders a value and needs nothing the headless layer owns, so through its
				// own entry it reaches neither.
				imports: ['textCellType'],
				pulls: ['@ez-kit/data-grid-heroui', '@ez-kit/data-grid-react'],
			},
		],
	},
	{
		name: '@ez-kit/data-grid-heroui/pagination',
		entry: subpathEntryOf('data-grid/react/heroui', 'pagination/index.js'),
		shakeable: [],
		cases: [
			{
				imports: ['paginationComponents'],
				pulls: ['@ez-kit/data-grid-core', '@ez-kit/data-grid-heroui', '@ez-kit/data-grid-react'],
			},
		],
	},
]

/**
 * The feature set, which is what the TanStack Table v9 migration was for.
 *
 * Under v8 the grid registered its features through the internal `_features` option and every
 * feature was reachable from every table, so this could not be asked at all. Under v9 a table is
 * assembled from the set the consumer names, and the promise is that a grid built without
 * `editingFeature` does not carry the editing code. That is the *whole* bundle argument for the
 * migration, so it gets a case rather than a paragraph.
 *
 * The question is asked with {@link bundledCodeOf} rather than {@link entryPointsPulledBy}: every
 * feature lives behind the one `@ez-kit/data-grid-core/features` entry point, so "which entry
 * points came along" cannot tell the two sets apart. `row_getIsEditing` is the row-API key
 * `editingFeature` installs and nothing else in the package names it, so its presence in the
 * output is the editing implementation surviving the shake.
 */
const FEATURES_ENTRY = subpathEntryOf('data-grid/core', 'features/index.js')
/** The row-API key `editingFeature` installs — present in a bundle exactly when its code is. */
const EDITING_MARKER = 'row_getIsEditing'
/** A set that registers sorting and nothing else. */
const SORTING_ONLY = ['tableFeatures', 'rowSortingFeature', 'createSortedRowModel']

describe('@ez-kit/data-grid-core/features', () => {
	// The control: without it an absence below would also be satisfied by a build that resolved
	// nothing. Naming `editingFeature` must bring the editing implementation with it.
	it('reaches the editing implementation when the set registers it', async () => {
		const code = await bundledCodeOf(FEATURES_ENTRY, [...SORTING_ONLY, 'editingFeature'])

		expect(code).toContain(EDITING_MARKER)
	})

	/**
	 * The promise, stated directly.
	 *
	 * It did not hold when this case was written. `allDataGridFeatures` was declared on the features
	 * entry itself as a top-level `tableFeatures({ ...stockFeatures, …, editingFeature, … })` call
	 * whose argument object spreads, and an object spread may run getters — so esbuild kept the whole
	 * expression and every feature named in it, whatever the importer asked for. Measured then:
	 * `tableFeatures` alone bundled 46 360 bytes and `allDataGridFeatures` 46 365, against 49 696 for
	 * the whole surface. Whichever single name you imported, you got ~93% of everything, which
	 * cancelled the migration's headline benefit.
	 *
	 * A `/* @__PURE__ *\/` annotation did not fix it — it moved the bundle to 46 504, the cost of the
	 * comments. Moving the declaration to `@ez-kit/data-grid-core/features/all` did. Measured after:
	 *
	 * | imported                        | bytes  |
	 * | ------------------------------- | -----: |
	 * | `tableFeatures`                 |    994 |
	 * | `rowSortingFeature`             |    998 |
	 * | the sorting-only set below      |  1 035 |
	 * | that set plus `editingFeature`  | 17 219 |
	 * | whole `/features` surface       | 48 086 |
	 *
	 * The `editingFeature` row is the honest one to read beside the others: 17 kB is what a feature
	 * with a real implementation costs, and the point is that you pay it when you register it and
	 * not before.
	 */
	it('does not reach the editing implementation when the set omits it', async () => {
		const code = await bundledCodeOf(FEATURES_ENTRY, SORTING_ONLY)

		expect(code).not.toContain(EDITING_MARKER)
	})

	it('costs meaningfully less than the whole surface', async () => {
		const [narrow, everything] = await Promise.all([
			bundledCodeOf(FEATURES_ENTRY, SORTING_ONLY),
			bundledCodeOf(FEATURES_ENTRY),
		])

		expect(narrow.length).toBeLessThan(everything.length / 2)
	})
})

describe.each(PACKAGES)('$name', ({ entry, shakeable, cases }) => {
	it.each(cases)('importing $imports pulls in $pulls', async ({ imports, pulls }) => {
		expect(await entryPointsPulledBy(entry, imports)).toEqual([...pulls].sort())
	})

	// Without this, a case's set would also be satisfied by a bundle that resolved nothing at all.
	it('reaches every shakeable entry point when the whole surface is imported', async () => {
		const everything = await entryPointsPulledBy(entry)

		expect(shakeable.filter((entryPoint) => !everything.includes(entryPoint))).toEqual([])
	})
})
