import { fileURLToPath } from 'node:url'

import { defineConfig } from 'vitest/config'

import { vitestPackageConfig } from '../../../../vitest.shared'

const base = vitestPackageConfig(import.meta.url)

// This package imports its own sources through `@form-shadcn/*` (see tsconfig `paths`)
// rather than the shared `@/*`, so the alias has to be mirrored here for tests to resolve.
export default defineConfig({
	...base,
	resolve: {
		...base.resolve,
		alias: {
			...base.resolve?.alias,
			'@form-shadcn': fileURLToPath(new URL('./src', import.meta.url)),
		},
	},
})
