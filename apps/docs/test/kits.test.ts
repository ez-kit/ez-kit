// @vitest-environment node
import { readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import { KITS } from '../e2e/kits'

/**
 * `e2e/kits.ts` drives one Playwright project per kit, so a kit missing from that list is a
 * kit nothing is tested against — silently, because every spec still passes for the kits that
 * are listed. The embed routes are the authority on which kits exist at all, so the two are
 * compared here rather than trusted to stay in step.
 */

const EMBED_ROUTES = fileURLToPath(new URL('../app/(embed)/examples', import.meta.url))

describe('KITS', () => {
	it('names exactly the kits that have an embed route', () => {
		const routed = readdirSync(EMBED_ROUTES, { withFileTypes: true })
			// `_styles` holds the per-kit stylesheets the routes import, not a route of its own —
			// Next ignores an underscore-prefixed segment, and so does this.
			.filter((entry) => entry.isDirectory() && !entry.name.startsWith('_'))
			.map((entry) => entry.name)
			.sort()

		expect([...KITS].sort()).toEqual(routed)
	})
})
