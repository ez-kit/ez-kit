import { render, screen } from '@testing-library/react'
import { proxy, snapshot } from 'valtio'
import { describe, expect, it } from 'vitest'

import { createContextStore } from '../create-context-store'

import { withHistory } from './with-history'

const flush = () =>
	new Promise<void>((resolve) => {
		queueMicrotask(resolve)
	})

describe('withHistory', () => {
	it('returns the same proxy identity', () => {
		const state = proxy({ count: 0 })
		expect(withHistory(state)).toBe(state)
	})

	it('exposes history through the snapshot as the same object (ref)', () => {
		const state = withHistory(proxy({ count: 0 }))
		expect(snapshot(state).history).toBe(state.history)
	})

	it('keeps history out of JSON', () => {
		const state = withHistory(proxy({ count: 0 }))
		expect(JSON.parse(JSON.stringify(snapshot(state)))).toEqual({ count: 0 })
	})

	it('records one entry per microtask batch by default', async () => {
		const state = withHistory(proxy({ count: 0 }))
		state.count = 1
		state.count = 2
		await flush()

		expect(state.history.state.pasts).toHaveLength(1)
	})

	it('records one entry per operation with sync: true', async () => {
		const state = withHistory(proxy({ count: 0 }), { sync: true })
		state.count = 1
		state.count = 2
		await flush()

		expect(state.history.state.pasts).toHaveLength(2)
	})

	it('records the user state without its own history key', async () => {
		const state = withHistory(proxy({ count: 0 }))
		state.count = 1
		await flush()

		expect(state.history.state.pasts).toEqual([{ count: 0 }])
	})

	it('undo restores the previous state without recording itself', async () => {
		const state = withHistory(proxy({ count: 0 }))
		state.count = 1
		await flush()

		state.history.undo()
		await flush()

		expect(state.count).toBe(0)
		expect(state.history.state.pasts).toHaveLength(0)
		expect(state.history.state.futures).toHaveLength(1)
	})

	it('flushes a still-pending write before undo, instead of losing it', async () => {
		const state = withHistory(proxy({ count: 0 }))
		state.count = 1
		await flush()
		// pasts is now [{ count: 0 }]; this write is still pending (no flush before undo below)
		state.count = 2

		state.history.undo()
		await flush()

		expect(state.count).toBe(1)
		expect(state.history.state.pasts).toEqual([{ count: 0 }])
		expect(state.history.state.futures).toEqual([{ count: 2 }])
	})

	it('redo replays the undone state', async () => {
		const state = withHistory(proxy({ count: 0 }))
		state.count = 1
		await flush()
		state.history.undo()
		await flush()

		state.history.redo()
		await flush()

		expect(state.count).toBe(1)
		expect(state.history.state.futures).toHaveLength(0)
	})

	it('restores nested objects as live proxies, not frozen snapshots', async () => {
		const state = withHistory(proxy({ nested: { a: 1 } }))
		state.nested = { a: 2 }
		await flush()

		state.history.undo()
		await flush()

		expect(state.nested.a).toBe(1)
		expect(() => {
			state.nested.a = 3
		}).not.toThrow()
	})

	it('deletes keys that the restored state does not have', async () => {
		const state = withHistory(proxy<{ a: number; b?: number }>({ a: 1 }))
		state.b = 2
		await flush()

		state.history.undo()
		await flush()

		expect('b' in state).toBe(false)
	})

	it('does not record mutations made inside skip', async () => {
		const state = withHistory(proxy({ count: 0 }))
		state.history.skip(() => {
			state.count = 5
		})
		await flush()

		expect(state.count).toBe(5)
		expect(state.history.state.pasts).toHaveLength(0)
	})

	it('flushes a still-pending write before skip, instead of losing it', async () => {
		const state = withHistory(proxy({ count: 0 }))
		state.count = 1
		// pending: no flush before skip below
		state.history.skip(() => {
			state.count = 99
		})
		await flush()

		expect(state.count).toBe(99)
		expect(state.history.state.pasts).toEqual([{ count: 0 }])
	})

	it('passes valtio ops to shouldRecord so a path can be excluded', async () => {
		const state = withHistory(proxy({ count: 0, hovered: false }), {
			shouldRecord: (_prev, _next, ops) => !ops?.every((op) => op[1][0] === 'hovered'),
		})

		state.hovered = true
		await flush()
		expect(state.history.state.pasts).toHaveLength(0)

		state.count = 1
		await flush()
		expect(state.history.state.pasts).toHaveLength(1)
	})

	it('treats the first render batch as the baseline, not as an entry', async () => {
		const store = createContextStore((init: { defaultValue: { count: number } }) =>
			withHistory(proxy({ count: init.defaultValue.count })),
		)

		// захватываем сам инстанс, а стек читаем ПОСЛЕ микротаска, когда valtio уже уведомил
		let instance: (typeof store extends { useStore: () => infer S } ? S : never) | undefined
		function Probe(): null {
			instance = store.useStore()
			return null
		}

		render(
			<store.Provider
				defaultValue={{ count: 0 }}
				value={{ count: 7 }}
			>
				<store.Subscribe>{({ snap }) => <span>{snap.count}</span>}</store.Subscribe>
				<Probe />
			</store.Provider>,
		)
		await flush()

		expect(screen.getByText('7')).toBeDefined()
		// начальный проброс controlled `value` не должен быть шагом истории
		expect(instance?.history.state.pasts).toHaveLength(0)
	})
})
