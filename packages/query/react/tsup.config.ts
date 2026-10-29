import { defineConfig } from 'tsup'

export default defineConfig({
	entry: { index: 'src/index.ts' },
	format: ['esm'],
	dts: true,
	sourcemap: true,
	clean: true,
	external: ['react', 'react-dom', '@tanstack/react-query'],
	/**
	 * Every export is a component or a context, so the bundle is client code. tsup bundles the
	 * source modules into one file and esbuild drops a `'use client'` that is no longer the first
	 * statement, so the directive is restored here.
	 */
	banner: { js: `'use client'` },
})
