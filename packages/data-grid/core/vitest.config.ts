import { defineConfig } from 'vitest/config'

import { vitestPackageConfig } from '../../../vitest.shared'

export default defineConfig(vitestPackageConfig(import.meta.url))
