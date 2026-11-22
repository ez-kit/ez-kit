import { describe, expect, it } from 'vitest'

import { addressBinding, createBinding } from './binding'
import { createPersistEngine } from './engine'
import { patchKeyed } from './storage/patch'
import { objectPort, observable } from './test-kit'

describe('audit: restore cannot overwrite reentrant application edits', () => {
	it.each(['width', 'height'] as const)('keeps a repair to %s made by onError', async (field) => {
		const state = observable({ width: 100, height: 100 })
		const parser = {
			parse(raw: string) {
				const parsed = Number(raw)
				if (!Number.isFinite(parsed)) throw new Error('malformed')
				return parsed
			},
		}
		const binding = createBinding(
			state,
			objectPort,
			[
				{ path: ['width'], parser },
				{ path: ['height'], parser },
			],
			{},
		)
		addressBinding(binding, { path: [], name: 'audit', id: 'a' })
		const [width, height] = [...binding.keyOf.values()]
		if (!width || !height) throw new Error('missing addressed fields')
		let saved = new Map([
			[width, '10'],
			[height, 'malformed'],
		])
		const key = field === 'width' ? width : height
		const engine = createPersistEngine(
			{
				get: () => new Map(saved),
				set(values, context) {
					saved = patchKeyed(saved, values, context)
				},
			},
			{
				onError: (_, event) => {
					if (event.operation === 'decode') state[field] = 20
				},
			},
		)
		const stop = engine.connect(binding)
		try {
			await engine.flush(binding)
			expect(state[field]).toBe(20)
			expect(saved.get(key)).toBe('20')
		} finally {
			stop()
			engine.dispose()
		}
	})
})
