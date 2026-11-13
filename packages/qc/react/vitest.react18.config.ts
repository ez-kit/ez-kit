import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'

import { defineConfig } from 'vitest/config'

import { vitestReact18Config } from '../../../vitest.shared'

const config = vitestReact18Config(import.meta.url)
// The workspace's CJS lucide build uses Node require and bypasses Vite's React 18
// aliases. Its ESM entry keeps the shadcn loading icon on the same React as the test.
const requireKit = createRequire(new URL('../../data-grid/react/shadcn/package.json', import.meta.url))
const lucideRoot = dirname(requireKit.resolve('lucide-react/package.json'))
config.resolve.alias.push({ find: /^lucide-react$/, replacement: join(lucideRoot, 'dist/esm/lucide-react.mjs') })

// Radix dialogs use CJS scroll-lock helpers by default. Resolve their ESM graph
// too, so its React imports pass through the same React 18 aliases.
const requireRadix = createRequire(requireKit.resolve('radix-ui'))
const requireDialog = createRequire(requireRadix.resolve('@radix-ui/react-dialog'))
const requireScroll = createRequire(requireDialog.resolve('react-remove-scroll'))
const requireBar = createRequire(requireScroll.resolve('react-remove-scroll-bar'))
for (const [name, resolveFrom] of [
	['react-remove-scroll', requireDialog],
	['react-remove-scroll-bar', requireScroll],
	['use-sidecar', requireScroll],
	['use-callback-ref', requireScroll],
	['react-style-singleton', requireBar],
] as const) {
	config.resolve.alias.push({
		find: new RegExp(`^${name}$`),
		replacement: join(dirname(resolveFrom.resolve(`${name}/package.json`)), 'dist/es2015/index.js'),
	})
}

export default defineConfig(config)
