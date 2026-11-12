import { defineConfig } from 'tsup'

export default defineConfig({
	entry: { 'data-grid': 'src/data-grid/index.ts' },
	format: ['esm'],
	dts: true,
	sourcemap: true,
	clean: true,
	external: ['react', 'react-dom', '@tanstack/react-query', '@ez-kit/data-grid-react'],
	banner: { js: `'use client'` },
})
