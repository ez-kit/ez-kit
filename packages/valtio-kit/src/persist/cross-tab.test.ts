import { proxy } from 'valtio'
import { describe, expect, it, vi } from 'vitest'

import { createBinding } from './binding'
import { paramString } from './codecs'
import { createPersistEngine } from './engine'

import type { SyncSourcePort } from './types'

/**
 * Let the whole reactive chain settle: valtio batches its subscription notifications in a microtask,
 * the engine schedules its flush in another, and a cross-tab pull re-triggers both on the other engine.
 * A macrotask boundary drains every pending microtask, so the dust has settled by the time it resolves.
 */
const settle = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0))

/**
 * A shared in-memory substrate with cross-tab semantics: a write notifies every *other* tab's
 * subscriber but never the writer's, exactly like the browser `storage` event. Each `tab()` call
 * returns an independent {@link SyncSourcePort} over the same backing store.
 */
function createCrossTabSubstrate() {
	const data = new Map<string, string>()
	const subscribers = new Set<() => void>()

	function tab(): SyncSourcePort {
		const own = { onChange: null as (() => void) | null }
		return {
			get: () => new Map(data),
			set: (desired) => {
				data.clear()
				for (const [key, value] of desired) {
					data.set(key, value)
				}
				for (const subscriber of subscribers) {
					if (subscriber !== own.onChange) {
						subscriber()
					}
				}
			},
			subscribe: (onChange) => {
				own.onChange = onChange
				subscribers.add(onChange)
				return () => {
					subscribers.delete(onChange)
					own.onChange = null
				}
			},
		}
	}

	return { tab, data }
}

describe('@ez-kit/valtio-kit persist cross-tab sync', () => {
	it('propagates a change from one tab to another with no write-back echo', async () => {
		const substrate = createCrossTabSubstrate()

		// Tab A.
		const portA = substrate.tab()
		const setSpyA = vi.spyOn(portA, 'set')
		const engineA = createPersistEngine(portA)
		const stateA = proxy({ q: '' })
		engineA.connect(createBinding(stateA, [{ path: ['q'], parser: paramString() }], {}))
		portA.subscribe?.(() => {
			engineA.pull(portA.get())
		})

		// Tab B.
		const portB = substrate.tab()
		const setSpyB = vi.spyOn(portB, 'set')
		const engineB = createPersistEngine(portB)
		const stateB = proxy({ q: '' })
		engineB.connect(createBinding(stateB, [{ path: ['q'], parser: paramString() }], {}))
		portB.subscribe?.(() => {
			engineB.pull(portB.get())
		})

		// Tab A writes.
		stateA.q = 'shoes'
		await settle()

		// B received the change…
		expect(stateB.q).toBe('shoes')
		expect(substrate.data.get('q')).toBe('shoes')
		expect(setSpyA).toHaveBeenCalledTimes(1)
		// …and the pull settled into B's baseline, so B never writes back (no A→B→A echo).
		expect(setSpyB).not.toHaveBeenCalled()
		expect(stateA.q).toBe('shoes')
	})

	// NOTE (documented limitation): two proxies bound to the *same* storage key within a *single* tab
	// are unsupported — the same-tab writer receives no `storage` event, so the second proxy is not
	// notified. Use one bound proxy per key per tab; cross-tab propagation is the supported path.
	it('does not notify a second engine sharing a key within the same tab (unsupported)', async () => {
		const substrate = createCrossTabSubstrate()
		const port = substrate.tab() // both engines share ONE tab/port

		const engineA = createPersistEngine(port)
		const stateA = proxy({ q: '' })
		engineA.connect(createBinding(stateA, [{ path: ['q'], parser: paramString() }], {}))

		const engineB = createPersistEngine(port)
		const stateB = proxy({ q: '' })
		engineB.connect(createBinding(stateB, [{ path: ['q'], parser: paramString() }], {}))
		port.subscribe?.(() => {
			engineB.pull(port.get())
		})

		stateA.q = 'shoes'
		await settle()

		// The same-tab subscriber is the writer, so B is not notified — confirming the limitation.
		expect(substrate.data.get('q')).toBe('shoes')
		expect(stateB.q).toBe('')
	})
})
