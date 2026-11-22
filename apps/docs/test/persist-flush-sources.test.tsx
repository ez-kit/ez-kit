import { createContextStore, pipe } from '@ez-kit/zu-store'
import { flushPersist, PersistProvider, withPersist } from '@ez-kit/zu-store/persist'
import { act, render } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { createStore } from 'zustand/vanilla'

import type { Keyed } from '@ez-kit/zu-store/persist'

it('waits for only the sources of the selected store and reports each result', async () => {
	const panelFor = (name: string) =>
		createContextStore(
			() =>
				pipe(
					createStore(() => ({ width: 100, height: 100 })),
					withPersist({
						throttleMs: 60_000,
						fields: (f) => [f((s) => s.width, {}), f((s) => s.height, { source: 'server' })],
					}),
				),
			{ name },
		)
	const panel = panelFor('settings')
	const sibling = panelFor('other-settings')
	let store!: ReturnType<typeof panel.useStore>
	let otherStore!: ReturnType<typeof sibling.useStore>
	function CaptureSibling() {
		otherStore = sibling.useStore()
		return null
	}
	function Capture() {
		store = panel.useStore()
		return null
	}
	const failure = new Error('server unavailable')
	let acknowledge!: () => void
	const pending = new Promise<void>((resolve) => {
		acknowledge = resolve
	})
	const server = vi.fn((_values: Keyed) => Promise.reject(failure))
	const browser = vi.fn((_values: Keyed) => pending)
	const unrelated = vi.fn()
	const get = (): Keyed => new Map()
	const view = render(
		<PersistProvider
			defaultSource='browser'
			adapters={{
				browser: { port: { get, set: browser } },
				server: { port: { get, set: server } },
				unrelated: { port: { get, set: unrelated } },
			}}
		>
			<panel.Provider>
				<Capture />
			</panel.Provider>
			<sibling.Provider>
				<CaptureSibling />
			</sibling.Provider>
		</PersistProvider>,
	)
	try {
		await act(async () => {
			otherStore.setState({ width: 600, height: 700 })
			store.setState({ width: 200, height: 300 })
			const completed = vi.fn()
			const result = flushPersist(store).then((outcomes) => {
				completed()
				return outcomes
			})
			await Promise.resolve()
			expect(completed).not.toHaveBeenCalled()
			expect(browser).toHaveBeenCalledOnce()
			expect(server).toHaveBeenCalledOnce()
			expect([...browser.mock.calls.flatMap(([values]) => [...values.values()])]).toEqual(['200'])
			expect([...server.mock.calls.flatMap(([values]) => [...values.values()])]).toEqual(['300'])
			expect(unrelated).not.toHaveBeenCalled()
			acknowledge()
			await expect(result).resolves.toEqual({
				browser: { status: 'fulfilled', value: undefined },
				server: { status: 'rejected', reason: failure },
			})
		})
	} finally {
		acknowledge()
		view.unmount()
	}
})
