import { proxy } from 'valtio'
import { describe, expect, it, vi } from 'vitest'

import { createBinding, type PersistBinding } from './binding'
import { createRegistry } from './registry'

import type { Parser } from './types'

const str: Parser<string> = { parse: (r) => r, stringify: (v) => v }

function binding(): PersistBinding {
	return createBinding(proxy({ q: '' }), [{ path: ['q'], parser: str }], {})
}

describe('@ez-kit/valtio-kit persist registry', () => {
	it('registers, lists, and deregisters bindings', () => {
		const registry = createRegistry()
		const a = binding()
		const b = binding()

		const removeA = registry.register(a)
		registry.register(b)
		expect(registry.getAll()).toHaveLength(2)

		removeA()
		expect(registry.getAll()).toEqual([b])
	})

	it('notifies listeners on register and deregister', () => {
		const registry = createRegistry()
		const listener = vi.fn()
		registry.subscribe(listener)

		const remove = registry.register(binding())
		expect(listener).toHaveBeenCalledTimes(1)

		remove()
		expect(listener).toHaveBeenCalledTimes(2)
	})

	it('stops notifying after unsubscribe', () => {
		const registry = createRegistry()
		const listener = vi.fn()
		const unsubscribe = registry.subscribe(listener)

		unsubscribe()
		registry.register(binding())
		expect(listener).not.toHaveBeenCalled()
	})

	it('is isolated per instance (no shared module state)', () => {
		const one = createRegistry()
		const two = createRegistry()

		one.register(binding())
		expect(one.getAll()).toHaveLength(1)
		expect(two.getAll()).toHaveLength(0)
	})
})
