// @vitest-environment node
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

import { entryPointsPulledBy } from './tree-shaking/bundle'

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
]

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
