import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import type { ViteUserConfig } from 'vitest/config'

export const vitestSharedConfig: ViteUserConfig = {
	test: {
		include: ['src/**/*.{test,spec}.{ts,tsx}', 'test/**/*.{test,spec}.{ts,tsx}'],
		setupFiles: [fileURLToPath(new URL('./vitest.setup.ts', import.meta.url))],
		environment: 'jsdom',
		/**
		 * Cap the worker pool rather than letting vitest size it to the machine.
		 *
		 * Turbo runs several packages' suites at once, and each vitest instance would otherwise
		 * open a pool the width of the whole machine — on an 8-core laptop that is up to ten
		 * packages times ~7 threads, roughly nine times more threads than cores. Nothing fails
		 * outright; tests that wait on a deadline (`waitFor`, and anything else measured against
		 * vitest's 5 s default) simply stop getting scheduled in time, and the suite goes
		 * intermittently red in whichever package lost the race. Four such failures were traced
		 * to this during the field-registry work, each in a different package, each passing on
		 * its own.
		 *
		 * This is the *second* half of a cap that already existed: `turbo.json` sets
		 * `"concurrency": "50%"`, with the measurements behind it in a comment there. That limits
		 * how many packages run at once; this limits how wide each one's pool opens, which turbo
		 * cannot see. Between them the total stays near the core count, and the timeout below
		 * covers what neither can — another process on the machine that turbo knows nothing about.
		 */
		poolOptions: {
			threads: {
				maxThreads: 4,
			},
		},
		/**
		 * Three times vitest's 5 s default, because 5 s is not a statement about these tests — it
		 * is a statement about how quickly the machine happens to schedule them.
		 *
		 * The capped pool above cut the oversubscription that caused this, but did not remove it:
		 * a measured failure sat at 5466 ms against the 5000 ms limit, and passed on its own
		 * moments later. Every failure of this kind in this repo has had the same signature —
		 * a timeout, never a failed assertion, in whichever package lost the race.
		 *
		 * What this costs: a test that genuinely hangs now takes 15 s to say so instead of 5. What
		 * it does not cost is the ability to notice something getting slower — vitest prints each
		 * file's duration, and a suite drifting toward the limit shows up there long before it
		 * fails. Raise this again only with a measurement, and say what it was.
		 */
		testTimeout: 15_000,
		coverage: {
			reporter: ['text', 'html'],
			/**
			 * `.tsx` as well as `.ts`. The pattern used to name only `.ts`, which quietly excluded
			 * every React component in the repo — the UI kits are almost entirely `.tsx`, so they
			 * would have reported a near-empty file set and looked well covered.
			 */
			include: ['src/**/*.{ts,tsx}'],
			/** A test file must not count itself, and the test kit is a fixture, not shipped code. */
			exclude: ['src/**/*.{test,spec}.{ts,tsx}', 'src/test-kit.{ts,tsx}'],
			/**
			 * The repo's 80% floor, enforced rather than merely reported: `pnpm test:coverage` fails
			 * below it. Plain `pnpm test` runs without coverage and is unaffected.
			 */
			thresholds: {
				statements: 80,
				branches: 80,
				functions: 80,
				lines: 80,
			},
		},
	},
}

/**
 * Vitest config for packages that use the `@/*` → `src/*` path alias.
 *
 * Pass `import.meta.url` from the package's `vitest.config.ts` so the alias
 * resolves to that package's own `src/` directory:
 *
 * ```ts
 * import { defineConfig } from 'vitest/config'
 * import { vitestPackageConfig } from '../../../vitest.shared'
 *
 * export default defineConfig(vitestPackageConfig(import.meta.url))
 * ```
 */
export function vitestPackageConfig(packageMetaUrl: string): ViteUserConfig {
	return {
		...vitestSharedConfig,
		resolve: {
			alias: {
				'@': fileURLToPath(new URL('./src', packageMetaUrl)),
			},
		},
	}
}

/**
 * The same suite, run against **React 18** instead of the React 19 the repo develops on.
 *
 * The packages declare `react: ">=18.0.0"`, and the two React-19-only spellings — the
 * `<Context value>` JSX shorthand and `ref` as a plain prop — both fail *silently* on 18: the
 * shorthand renders a context object as an element, and a stripped `ref` leaves the code
 * measuring nothing. Neither shows up in a typecheck against React 19's types, so the promise
 * is only worth what this second run proves.
 *
 * The `find` patterns are anchored regexes rather than plain strings: Vite matches a string alias
 * as a prefix, so a bare `'react'` would swallow `react-dom` as well.
 */
export function vitestReact18Config(packageMetaUrl: string): ViteUserConfig {
	// React 18 lives in its own workspace package (`tools/react18-env`) because pnpm resolves a peer
	// from the *importer's* dependencies: installed as an npm alias beside the repo's React 19,
	// `react-dom@18` linked itself to `react@19` and died reading `ReactCurrentDispatcher` off
	// internals React 19 no longer has. In a package of their own, the pair links to itself.
	//
	// Paths are joined onto that package's `node_modules` rather than resolved through
	// `require.resolve`: several of these packages do not export `./package.json`, and no other
	// entry point yields the package directory an alias needs.
	const envRoot = fileURLToPath(new URL('./tools/react18-env/node_modules', import.meta.url))
	const envDir = (specifier: string): string => join(envRoot, specifier)
	const react18Dir = envDir('react')
	const reactDom18Dir = envDir('react-dom')
	// Testing Library imports `react-dom/client` itself, and it is externalized, so Node — not
	// Vite — resolves that import and the aliases below never see it. `react18-env` therefore holds
	// its own copy, linked by pnpm against React 18, and the whole stack is redirected there.
	const testingLibraryDir = envDir('@testing-library/react')
	const userEventDir = envDir('@testing-library/user-event')
	const jestDomDir = envDir('@testing-library/jest-dom')
	// Same problem one layer down: `use-sync-external-store`'s shim is CJS, and a `require('react')`
	// inside CJS is resolved by Node even when the importer was inlined.
	const useSyncExternalStoreDir = envDir('use-sync-external-store')

	return {
		...vitestSharedConfig,
		test: {
			...vitestSharedConfig.test,
			server: {
				/**
				 * Externalized dependencies are loaded by Node, not Vite, so the aliases below never
				 * see their imports: `@tanstack/react-virtual` kept pulling React 19 into a tree React
				 * 18 was rendering. Inlining the whole graph is the only setting that holds for every
				 * React-consuming dependency without naming them one by one.
				 */
				deps: { inline: true },
			},
		},
		resolve: {
			alias: [
				{ find: /^react$/, replacement: react18Dir },
				{ find: /^react\/(.*)$/, replacement: `${react18Dir}/$1` },
				{ find: /^react-dom$/, replacement: reactDom18Dir },
				{ find: /^react-dom\/(.*)$/, replacement: `${reactDom18Dir}/$1` },
				{ find: /^@testing-library\/react$/, replacement: testingLibraryDir },
				{ find: /^@testing-library\/user-event$/, replacement: userEventDir },
				{ find: /^@testing-library\/jest-dom$/, replacement: jestDomDir },
				{ find: /^@testing-library\/jest-dom\/(.*)$/, replacement: `${jestDomDir}/$1` },
				{ find: /^use-sync-external-store$/, replacement: useSyncExternalStoreDir },
				{ find: /^use-sync-external-store\/(.*)$/, replacement: `${useSyncExternalStoreDir}/$1` },
				{ find: /^@\//, replacement: `${fileURLToPath(new URL('./src', packageMetaUrl))}/` },
			],
		},
	}
}
