import { defineConfig } from 'vitest/config'

import { vitestPackageConfig } from '../../vitest.shared'

const base = vitestPackageConfig(import.meta.url)

export default defineConfig({
	...base,
	esbuild: {
		jsx: 'automatic',
	},
	test: {
		...base.test,
		exclude: ['tests/**/*.visual.spec.ts'],
	},
})
