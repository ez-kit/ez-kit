import { defineConfig } from 'tsup'

export default defineConfig({
	entry: {
		index: 'src/index.ts',
		'features/index': 'src/features/entry.ts',
		'features/all': 'src/features/all.ts',
		'operators/index': 'src/operators/entry.ts',
		'messages/en': 'src/messages/en.ts',
		'messages/ru': 'src/messages/ru.ts',
	},
	format: ['esm'],
	dts: true,
	sourcemap: true,
	clean: true,
	external: ['react', 'react-dom', 'zod'],
	// The shipped dictionaries are mostly non-ASCII; escaped as `\uXXXX` they were three times the size.
	esbuildOptions(options) {
		options.charset = 'utf8'
	},
})
