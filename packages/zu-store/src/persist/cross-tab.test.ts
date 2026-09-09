import { createBinding, createPersistEngine } from '@ez-kit/store-persist/internals'
import { describe, expect, it, vi } from 'vitest'
import { createStore } from 'zustand/vanilla'

import { paramString, zustandPort } from './index'

import type { SyncSourcePort } from './index'

/**
 * Let the whole reactive chain settle: the engine schedules its flush in a microtask and a cross-tab
 * pull re-triggers it on the other engine. A macrotask boundary drains every pending microtask.
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

type Filters = { q: string; page: string }

const makeStore = () => createStore<Filters>()(() => ({ q: '', page: '' }))

describe('@ez-kit/zu-store persist cross-tab sync', () => {
	it('propagates a change from one tab to another with no write-back echo', async () => {
		const substrate = createCrossTabSubstrate()

		// Tab A.
		const portA = substrate.tab()
		const setSpyA = vi.spyOn(portA, 'set')
		const engineA = createPersistEngine(portA)
		const storeA = makeStore()
		engineA.connect(createBinding(storeA, zustandPort, [{ path: ['q'], parser: paramString() }], {}))
		portA.subscribe?.(() => {
			engineA.pull(portA.get())
		})

		// Tab B.
		const portB = substrate.tab()
		const setSpyB = vi.spyOn(portB, 'set')
		const engineB = createPersistEngine(portB)
		const storeB = makeStore()
		engineB.connect(createBinding(storeB, zustandPort, [{ path: ['q'], parser: paramString() }], {}))
		portB.subscribe?.(() => {
			engineB.pull(portB.get())
		})

		// Tab A writes.
		storeA.setState({ q: 'shoes' })
		await settle()

		// B received the change…
		expect(storeB.getState().q).toBe('shoes')
		expect(substrate.data.get('q')).toBe('shoes')
		expect(setSpyA).toHaveBeenCalledTimes(1)
		// …and the pull settled into B's baseline, so B never writes back (no A→B→A echo).
		expect(setSpyB).not.toHaveBeenCalled()
		expect(storeA.getState().q).toBe('shoes')
	})

	it('applies a multi-field cross-tab pull as ONE notification', async () => {
		const substrate = createCrossTabSubstrate()

		const portA = substrate.tab()
		const engineA = createPersistEngine(portA)
		const storeA = makeStore()
		engineA.connect(
			createBinding(
				storeA,
				zustandPort,
				[
					{ path: ['q'], parser: paramString() },
					{ path: ['page'], parser: paramString() },
				],
				{},
			),
		)

		const portB = substrate.tab()
		const engineB = createPersistEngine(portB)
		const storeB = makeStore()
		engineB.connect(
			createBinding(
				storeB,
				zustandPort,
				[
					{ path: ['q'], parser: paramString() },
					{ path: ['page'], parser: paramString() },
				],
				{},
			),
		)
		portB.subscribe?.(() => {
			engineB.pull(portB.get())
		})

		// Subscribe only after both engines settled their initial connect.
		await settle()
		const listener = vi.fn()
		storeB.subscribe(listener)

		storeA.setState({ q: 'shoes', page: '3' })
		await settle()

		expect(storeB.getState()).toEqual({ q: 'shoes', page: '3' })
		// The Zustand port rebuilds the touched paths and issues a single `setState` for the batch —
		// two fields arriving together must not notify selectors twice.
		expect(listener).toHaveBeenCalledTimes(1)
	})

	// NOTE (documented limitation): two stores bound to the *same* storage key within a *single* tab
	// are unsupported — the same-tab writer receives no `storage` event, so the second store is not
	// notified. Use one bound store per key per tab; cross-tab propagation is the supported path.
	it('does not notify a second engine sharing a key within the same tab (unsupported)', async () => {
		const substrate = createCrossTabSubstrate()
		const port = substrate.tab() // both engines share ONE tab/port

		const engineA = createPersistEngine(port)
		const storeA = makeStore()
		engineA.connect(createBinding(storeA, zustandPort, [{ path: ['q'], parser: paramString() }], {}))

		const engineB = createPersistEngine(port)
		const storeB = makeStore()
		engineB.connect(createBinding(storeB, zustandPort, [{ path: ['q'], parser: paramString() }], {}))
		port.subscribe?.(() => {
			engineB.pull(port.get())
		})

		storeA.setState({ q: 'shoes' })
		await settle()

		// The same-tab subscriber is the writer, so B is not notified — confirming the limitation.
		expect(substrate.data.get('q')).toBe('shoes')
		expect(storeB.getState().q).toBe('')
	})
})
