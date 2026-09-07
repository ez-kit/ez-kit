import { defineConfig } from 'tsup'

export default defineConfig({
	entry: {
		index: 'src/index.ts',
		internals: 'src/internals.ts',
		'storage/index': 'src/storage/index.ts',
		'url/index': 'src/url/index.ts',
		'url/react-router': 'src/url/react-router.ts',
		'url/next': 'src/url/next.tsx',
		'validators/zod': 'src/validators/zod.ts',
		'testing/index': 'src/testing/index.ts',
	},
	format: ['esm'],
	dts: true,
	sourcemap: true,
	clean: true,
	external: ['react', 'react-dom', 'react-router', 'next', 'zod'],
})
