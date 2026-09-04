import { describe, expect, it } from 'vitest'

import { attachCapability, capabilitiesOf } from './capability'

import type { StorePlugin } from './plugin'

const noop: StorePlugin<object>['setup'] = () => undefined

describe('capability registry', () => {
	it('returns an empty list for a bare object', () => {
		expect(capabilitiesOf({})).toEqual([])
	})

	it('keeps attachment order (innermost wrapper first)', () => {
		const target = {}
		attachCapability(target, { name: 'history', setup: noop })
		attachCapability(target, { name: 'persist', setup: noop })

		expect(capabilitiesOf(target).map((plugin) => plugin.name)).toEqual(['history', 'persist'])
	})

	it('hides the registry from enumeration, spreading and JSON', () => {
		const target: Record<string, unknown> = { count: 0 }
		attachCapability(target, { name: 'history', setup: noop })

		expect(Object.keys(target)).toEqual(['count'])
		expect({ ...target }).toEqual({ count: 0 })
		expect(JSON.parse(JSON.stringify(target))).toEqual({ count: 0 })
	})

	it('does not inherit capabilities through the prototype chain', () => {
		const parent = {}
		attachCapability(parent, { name: 'history', setup: noop })

		expect(capabilitiesOf(Object.create(parent) as object)).toEqual([])
	})

	it('rejects two plugins with the same name on one instance', () => {
		const target = {}
		attachCapability(target, { name: 'persist', setup: noop })

		expect(() => {
			attachCapability(target, { name: 'persist', setup: noop })
		}).toThrow(/persist/)
	})
})
