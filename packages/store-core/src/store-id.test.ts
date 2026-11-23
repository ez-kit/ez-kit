import { describe, expect, it } from 'vitest'

import { deserializePersistAddress, isWithinScope, serializePersistAddress } from './store-id'

describe('persistent addresses', () => {
	it('round-trips arbitrary path/name/id/field segments without separator collisions', () => {
		const addresses = [
			{ store: { path: ['a/b', '', '.'], name: 'panel.workspace', id: '[]/"' }, field: ['layout', ''] },
			{ store: { path: ['a', 'b', '', '.'], name: 'panel.workspace', id: '[]/"' }, field: ['layout', ''] },
		]
		const keys = addresses.map(serializePersistAddress)
		expect(new Set(keys).size).toBe(addresses.length)
		for (const [index, address] of addresses.entries()) {
			expect(deserializePersistAddress(keys[index] ?? '')).toEqual(address)
		}
	})

	it('does not treat foreign, malformed, or legacy keys as addressed records', () => {
		for (const key of [
			'width',
			'devices/workspace',
			'ez-kit:record:{',
			'ez-kit:record:[1,[]]',
			'ez-kit:record:["[]",[]]',
		]) {
			expect(deserializePersistAddress(key)).toBeUndefined()
		}
	})

	it('includes the scope itself and descendants but excludes similarly named siblings', () => {
		expect(isWithinScope(['devices'], ['devices'])).toBe(true)
		expect(isWithinScope(['devices', 'details'], ['devices'])).toBe(true)
		expect(isWithinScope(['devices-old'], ['devices'])).toBe(false)
		expect(isWithinScope(['a/b'], ['a', 'b'])).toBe(false)
		expect(isWithinScope(['devices'], [])).toBe(true)
	})
})
