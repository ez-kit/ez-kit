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
	 * originate in `@ez-kit/form-core` and reach this kit through `@ez-kit/form-react`, whose
	 * bundle carries the same banner. Only `@ez-kit/form-core` carries no directive, so a server
	 * component or a server action imports them from there — and the app installs
	 * `@ez-kit/form-core` itself for that, since the kit no longer depends on it directly.
	 */
	banner: { js: `'use client'` },
})
