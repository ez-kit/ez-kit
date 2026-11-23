import { defineConfig } from 'tsup'

export default defineConfig({
	entry: { index: 'src/index.ts', collection: 'src/collection/index.ts' },
	format: ['esm'],
	dts: true,
	sourcemap: true,
	clean: true,
	external: ['react', 'react-dom', '@tanstack/react-query'],
	/**
	 * Both entries include React components or hooks, so the bundles are client code. tsup bundles the
	 * source modules into one file and esbuild drops a `'use client'` that is no longer the first
	 * statement, so the directive is restored here.
	 */
	banner: { js: `'use client'` },
})
