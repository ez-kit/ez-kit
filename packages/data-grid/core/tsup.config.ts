import { defineConfig } from 'tsup'

export default defineConfig({
	entry: {
		index: 'src/index.ts',
		'features/index': 'src/features/entry.ts',
	},
	format: ['esm'],
	dts: true,
	sourcemap: true,
	clean: true,
	external: ['react', 'react-dom', 'zod'],
})
