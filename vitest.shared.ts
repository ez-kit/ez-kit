import { fileURLToPath } from 'node:url'

import type { ViteUserConfig } from 'vitest/config'

export const vitestSharedConfig: ViteUserConfig = {
	test: {
		include: ['src/**/*.{test,spec}.{ts,tsx}', 'test/**/*.{test,spec}.{ts,tsx}'],
		setupFiles: [fileURLToPath(new URL('./vitest.setup.ts', import.meta.url))],
		environment: 'jsdom',
		coverage: {
			reporter: ['text', 'html'],
			/**
			 * `.tsx` as well as `.ts`. The pattern used to name only `.ts`, which quietly excluded
			 * every React component in the repo — the UI kits are almost entirely `.tsx`, so they
			 * would have reported a near-empty file set and looked well covered.
			 */
			include: ['src/**/*.{ts,tsx}'],
			/** A test file must not count itself, and the test kit is a fixture, not shipped code. */
			exclude: ['src/**/*.{test,spec}.{ts,tsx}', 'src/test-kit.tsx'],
		},
	},
}

/**
 * Vitest config for packages that use the `@/*` → `src/*` path alias.
 *
 * Pass `import.meta.url` from the package's `vitest.config.ts` so the alias
 * resolves to that package's own `src/` directory:
 *
 * ```ts
 * import { defineConfig } from 'vitest/config'
 * import { vitestPackageConfig } from '../../../vitest.shared'
 *
 * export default defineConfig(vitestPackageConfig(import.meta.url))
 * ```
 */
export function vitestPackageConfig(packageMetaUrl: string): ViteUserConfig {
	return {
		...vitestSharedConfig,
		resolve: {
			alias: {
				'@': fileURLToPath(new URL('./src', packageMetaUrl)),
			},
		},
	}
}
