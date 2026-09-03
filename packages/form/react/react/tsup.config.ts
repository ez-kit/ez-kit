import { defineConfig } from 'tsup'

export default defineConfig({
	entry: { index: 'src/index.ts' },
	format: ['esm'],
	dts: true,
	sourcemap: true,
	clean: true,
	/**
	 * Every export of this entry is a hook, a context or a component, so the whole bundle is
	 * client code. The `'use client'` directives live on the source modules, but tsup bundles
	 * them into one file and esbuild drops a directive that is no longer the first statement —
	 * so without this banner the published `dist/index.js` carries none, and importing the form
	 * from a React Server Component fails with an unrelated-looking hook error.
	 *
	 * Pure, server-safe helpers (`stripHiddenValues`, `parseFormSchema`, `clampToGridRange`, …)
	 * are re-exported here for convenience but originate in `@ez-kit/form-core`, which carries
	 * no directive — import them from there in a server component or a server action.
	 */
	banner: { js: `'use client'` },
})
