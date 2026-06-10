import { defineConfig } from 'tsup'

export default defineConfig({
	entry: {
		index: 'src/index.ts',
		'search-params/index': 'src/search-params/index.ts',
		'search-params/routers/react-router': 'src/search-params/routers/react-router.ts',
		'search-params/routers/next': 'src/search-params/routers/next.tsx',
		'search-params/validators/zod': 'src/search-params/validators/zod.ts',
		'search-params/encoders/qs': 'src/search-params/encoders/qs.ts',
	},
	format: ['esm'],
	dts: true,
	sourcemap: true,
	clean: true,
	external: ['react', 'react-dom', 'valtio', 'react-router', 'next', 'zod', 'qs'],
})
