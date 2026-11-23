import { expect, it } from 'vitest'

import { addressBinding, captureDefaults, createBinding } from './binding'
import { paramArray, paramNumber } from './codecs'
import { createPersistEngine } from './engine'
import { patchKeyed } from './storage/patch'
import { objectPort, observable } from './test-kit'

it('persists a sparse array with non-default serialized content', async () => {
	const state = observable({ values: [1, 2, 3] })
	const binding = createBinding(state, objectPort, [{ path: ['values'], parser: paramArray(paramNumber()) }], {})
	captureDefaults(binding)
	addressBinding(binding, { path: [], name: 'account', id: 'one' })
	const [key] = binding.keyOf.values()
	if (!key) throw new Error('missing key')
	let saved = new Map<string, string>()
	const engine = createPersistEngine({
		get: () => saved,
		set: (desired, context) => {
			saved = patchKeyed(saved, desired, context)
		},
	})
	const disconnect = engine.connect(binding)
	try {
		state.values = [7]
		await engine.flush(binding)
		expect(saved.get(key)).toBe('7')
		const next = [1, 2, 3]
		Reflect.deleteProperty(next, 1)
		state.values = next
		await engine.flush(binding)
		expect(binding.status).toMatchObject({ dirty: false, write: 'idle' })
		expect(saved.get(key)).toBe('1,3')
	} finally {
		disconnect()
		engine.dispose()
	}
})
