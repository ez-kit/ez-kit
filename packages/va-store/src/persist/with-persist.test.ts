import { capabilitiesOf } from '@ez-kit/store-core'
import { proxy } from 'valtio'
import { describe, expect, it } from 'vitest'

import { withPersist } from './with-persist'

describe('withPersist', () => {
	it('returns the same proxy identity', () => {
		const state = proxy({ q: '' })
		expect(withPersist(state, {})).toBe(state)
	})

	it('registers exactly one persist capability', () => {
		const state = withPersist(proxy({ q: '' }), {})
		expect(capabilitiesOf(state).map((plugin) => plugin.name)).toEqual(['persist'])
	})

	it('keeps the proxy free of extra enumerable keys', () => {
		const state = withPersist(proxy({ q: '' }), {})
		expect(Object.keys(state)).toEqual(['q'])
	})
})
