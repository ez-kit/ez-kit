import { defineConfig } from 'tsup'

export default defineConfig({
	entry: {
		index: 'src/index.ts',
		'history/index': 'src/history/index.ts',
		'persist/index': 'src/persist/index.ts',
		'persist/internals': 'src/persist/internals.ts',
		'persist/storage/index': 'src/persist/storage/index.ts',
		'persist/url/index': 'src/persist/url/index.ts',
		'persist/url/react-router': 'src/persist/url/react-router.ts',
		'persist/url/next': 'src/persist/url/next.tsx',
		'persist/validators/zod': 'src/persist/validators/zod.ts',
		'persist/testing/index': 'src/persist/testing/index.ts',
	},
	format: ['esm'],
	dts: true,
	sourcemap: true,
	clean: true,
	external: ['react', 'react-dom', 'valtio', 'react-router', 'next', 'zod'],
})
