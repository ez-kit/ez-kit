import { expect, it } from 'vitest'

import { addressBinding, createBinding } from '../binding'
import { createPersistEngine } from '../engine'
import { encodeRecord } from '../record'
import { patchKeyed } from '../storage/patch'
import { objectPort, observable } from '../test-kit'

import { paramJson } from './param-json'

it.each([true, false])('clearing an optional JSON field removes the override (versioned=%s)', async (versioned) => {
	const store = observable<{ selected: { id: string } | null | undefined }>({ selected: undefined })
	const binding = createBinding(
		store,
		objectPort,
		[{ path: ['selected'], parser: paramJson<{ id: string } | null | undefined>() }],
		{ clearOnDefault: false },
	)
	addressBinding(binding, { path: [], name: 'account', id: 'one' })
	const [key] = binding.keyOf.values()
	if (!key) throw new Error('missing key')
	let persisted = new Map([[key, versioned ? encodeRecord('{"id":"old"}') : '{"id":"old"}']])
	const engine = createPersistEngine({
		capabilities: { recordVersions: versioned },
		get: () => persisted,
		set: (desired, context) => {
			persisted = patchKeyed(persisted, desired, context)
		},
	})
	const disconnect = engine.connect(binding)
	try {
		expect(store.selected).toEqual({ id: 'old' })
		store.selected = undefined
		await engine.flush(binding)
		expect(binding.status.dirty).toBe(false)
		expect(persisted.has(key)).toBe(false)
		store.selected = null
		await engine.flush(binding)
		expect(persisted.get(key)).toBe(versioned ? encodeRecord('null') : 'null')
	} finally {
		disconnect()
		engine.dispose()
	}
})
