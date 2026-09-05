/**
 * @vitest-environment node
 *
 * `withHistory` bails out of its client-only work (the valtio subscription) when there is no `window`.
 * The capability registration must NOT be part of that bail-out: `attachCapability` is a
 * side-effect-free record of what the store *is*, so a store built during a server render has to
 * report the same capabilities as the same store built in the browser — otherwise a mount-time seam
 * that reads `capabilitiesOf` sees nothing to run.
 */
import { capabilitiesOf } from '@ez-kit/store-core'
import { proxy } from 'valtio'
import { describe, expect, it } from 'vitest'

import { withHistory } from './with-history'

describe('withHistory on the server', () => {
	it('has no window', () => {
		expect(typeof window).toBe('undefined')
	})

	it('registers its capability even though the subscription is skipped', () => {
		const state = withHistory(proxy({ count: 0 }))

		expect(capabilitiesOf(state).map((plugin) => plugin.name)).toEqual(['history'])
	})

	it('still exposes the history API', () => {
		const state = withHistory(proxy({ count: 0 }))

		expect(typeof state.history.undo).toBe('function')
	})
})
