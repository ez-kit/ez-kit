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
 * only `createContextStore` carried the whole `store-core/cache` graph for a cache it never
 * mounted. Nothing failed: the packages built, the types were right, and
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
	 * measured the same as importing the whole `DataGrid`, while through its own entry it is a
	 * rounding error. What the cases below hold is that each entry stays clear of the graph the
	 * root drags in — `@tanstack/table-core` above all, which arrives through
	 * `@ez-kit/data-grid-core` and is most of the difference.
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
	 * doing. Nearly every block imported `useGridMessages` from the adapter root, which anchored the
	 * whole of it into any bundle that reached that block: a kit's `textCellType` alone bundled to
	 * roughly the size of the entire adapter. Through this entry the same primitives are cheap.
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
	 * cost the same to within a few bytes — which is what one indivisible unit looks like. Through
	 * their own entries each costs what it is: a text cell is small, a date cell carries its
	 * picker.
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
	 * expression and every feature named in it, whatever the importer asked for. Whichever single
	 * name you imported, you got nearly everything, which cancelled the migration's headline
	 * benefit.
	 *
	 * A `/* @__PURE__ *\/` annotation did not fix it — it cost the bytes of the comments and saved
	 * nothing. Moving the declaration to `@ez-kit/data-grid-core/features/all` did: a single feature
	 * or a sorting-only set now costs a rounding error, while that same set plus `editingFeature`
	 * costs what a feature with a real implementation behind it weighs. The point is that you pay it
	 * when you register it and not before.
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

/**
 * The kit root, where the prebuilt `DataGrid` binds `allDataGridFeatures` and `createDataGrid`
 * must not.
 *
 * Binding the set is what makes the prebuilt honest — it already pulls all fourteen component
 * groups, which read the features' APIs and drag their implementations in whatever set a call
 * site names, so demanding `features` there bought a rounding error. Composing a grid through
 * `createDataGrid` is the path where the set still decides what ships, and both names live behind
 * the same package root: `DataGrid` in `./data-grid`, `createDataGrid` through `index.ts`'s star
 * re-export of the adapter.
 *
 * So the binding is one import away from cancelling the thing it is measured against. Move it up
 * into a module the star re-export reaches — or let a future `index.ts` name `allDataGridFeatures`
 * for any reason — and every composed grid silently carries every feature. Asked with
 * {@link bundledCodeOf} rather than {@link entryPointsPulledBy} because `features/all.js` and
 * `features/index.js` fold onto the same entry point name, which cannot tell them apart.
 */
describe('@ez-kit/data-grid-heroui', () => {
	const KIT_ENTRY = entryOf('data-grid/react/heroui')

	// The control: the prebuilt grid is the all-in one, and that is deliberate.
	it('reaches every feature through the prebuilt DataGrid', async () => {
		expect(await bundledCodeOf(KIT_ENTRY, ['DataGrid'])).toContain(EDITING_MARKER)
	})

	it('does not reach them through createDataGrid', async () => {
		expect(await bundledCodeOf(KIT_ENTRY, ['createDataGrid'])).not.toContain(EDITING_MARKER)
	})

	/**
	 * The kit's own blocks must not name the adapter's compound namespace.
	 *
	 * One line did: `table-adapters.tsx` split `<DataGrid.Footer>` out of the table's children
	 * with `child.type === DataGrid.Footer`, and reading one key off the compound keeps all 29
	 * components — which cost this entry several times its own weight until the check named
	 * `DataGridFooter` directly, and again until React Aria's own `TableFooter` removed the need
	 * to split anything at all. Every other reference to the adapter in either kit is an
	 * `import type`, which is erased — that was the only one, and the shadcn kit never had it.
	 * The case stays because the rule is about the namespace, not about that one call site.
	 *
	 * Asked with {@link bundledCodeOf}: `./core` legitimately reaches `@ez-kit/data-grid-react`,
	 * so entry-point sets cannot see the difference. `data-slot='filter-panel'` is written by the
	 * adapter's `FilterPanel` and by nothing in this group, so its presence is the compound
	 * surviving the shake. Note the marker is only unambiguous *here* — the kits' own
	 * `./filtering` group authors that same literal.
	 */
	it('does not reach the compound namespace through a component group', async () => {
		const core = subpathEntryOf('data-grid/react/heroui', 'core/index.js')

		expect(await bundledCodeOf(core, ['coreComponents'])).not.toContain('filter-panel')
	})
})

/**
 * The adapter's root, where the compound `DataGrid` must not anchor its 29 components.
 *
 * Asked with {@link bundledCodeOf} rather than {@link entryPointsPulledBy} because this defect is
 * invisible to entry-point sets: `useDataGridTable` and `DataGrid` both reach
 * `@ez-kit/data-grid-core` and `@ez-kit/data-grid-react` and nothing else, before the fix and
 * after it. What differs is how much of the second one comes along, which is a question about the
 * bundle's text.
 *
 * It did not hold when this case was written. The namespace was assembled by 29 top-level
 * `DataGrid.Toolbar = Toolbar` statements, which esbuild cannot drop, so each one anchored its
 * component and everything that component reached, so any partial import paid for nearly the whole
 * package. One `/* @__PURE__ *\/`-annotated `Object.assign` with a flat object literal fixed it: a
 * hook or a single named component now costs a fraction of the surface.
 *
 * `{ DataGrid }` is the honest one to read beside those: it did not get cheaper and must not,
 * because that name is the whole compound namespace. What got cheaper is every import that never
 * asked for it. See `packages/data-grid/react/react/src/data-grid/data-grid.tsx` for why the
 * literal must stay flat, and why a getter namespace measured worse than doing nothing.
 *
 * Note this case, like every other one in this file, is an **esbuild** guarantee — that is what
 * {@link bundledCodeOf} bundles with. Rollup and Turbopack were probed on this defect and neither
 * was ever affected by it; esbuild's purity analysis is the strictest of the three, which makes it
 * a reasonable proxy and not a proof for whatever bundler a consumer runs.
 *
 * `data-slot='filter-panel'` is written by `FilterPanel` and by nothing else in the package, so
 * its presence in the output is a compound member surviving the shake.
 */
describe('@ez-kit/data-grid-react', () => {
	const ADAPTER_ENTRY = entryOf('data-grid/react/react')
	/** The slot `FilterPanel` stamps — present in a bundle exactly when that component is. */
	const FILTER_PANEL_MARKER = 'filter-panel'

	// The control: without it an absence below would also be satisfied by a build that resolved
	// nothing. The compound namespace must still carry its members.
	it('reaches a compound member through DataGrid', async () => {
		expect(await bundledCodeOf(ADAPTER_ENTRY, ['DataGrid'])).toContain(FILTER_PANEL_MARKER)
	})

	it('does not reach one through a hook', async () => {
		expect(await bundledCodeOf(ADAPTER_ENTRY, ['useDataGridTable'])).not.toContain(FILTER_PANEL_MARKER)
	})

	/**
	 * Every compound member is also exported by name, and naming one must not bring the rest.
	 *
	 * That is the whole point of the named exports: `DataGrid` costs the whole namespace whatever a
	 * call site renders, while a grid composed from named components pays for the ones it names. If
	 * a named import reached `FilterPanel`, the compound would be back and the saving with it.
	 */
	it('does not reach one through a named component export', async () => {
		expect(await bundledCodeOf(ADAPTER_ENTRY, ['DataGridFooter'])).not.toContain(FILTER_PANEL_MARKER)
	})

	/** And the bare root must stay bare — `<DataGrid>` as a host would hand the saving back. */
	it('does not reach one through DataGridRoot', async () => {
		expect(await bundledCodeOf(ADAPTER_ENTRY, ['DataGridRoot'])).not.toContain(FILTER_PANEL_MARKER)
	})

	it('costs meaningfully less than the whole surface', async () => {
		const [narrow, everything] = await Promise.all([
			bundledCodeOf(ADAPTER_ENTRY, ['useDataGridTable']),
			bundledCodeOf(ADAPTER_ENTRY),
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
