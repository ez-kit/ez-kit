import { defineConfig } from 'vitest/config'

import { vitestSharedConfig } from '../../vitest.shared'

export default defineConfig({
	...vitestSharedConfig,
	test: {
		...vitestSharedConfig.test,
		exclude: ['tests/**/*.visual.spec.ts'],
	},
})
