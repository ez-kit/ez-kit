import { fileURLToPath } from 'node:url'

import { defineConfig } from 'vitest/config'

import { vitestPackageConfig } from '../../vitest.shared'

const base = vitestPackageConfig(import.meta.url)

export default defineConfig({
	...base,
	esbuild: {
		jsx: 'automatic',
	},
	resolve: {
		// This app has no `src/` directory — `@/*` maps to the app root (see
		// tsconfig.json paths), not `./src/*` like the shared default.
		alias: {
			'@': fileURLToPath(new URL('.', import.meta.url)),
		},
	},
	test: {
		...base.test,
		setupFiles: [...(base.test?.setupFiles ?? []), fileURLToPath(new URL('./vitest.setup.docs.ts', import.meta.url))],
		exclude: ['tests/**/*.visual.spec.ts'],
	},
})
