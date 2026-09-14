import { defineConfig } from 'vitest/config'

import { vitestReact18Config } from '../../../../vitest.shared'

export default defineConfig(vitestReact18Config(import.meta.url))
