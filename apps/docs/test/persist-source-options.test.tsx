import { createContextStore, pipe } from '@ez-kit/zu-store'
import { PersistProvider, withPersist } from '@ez-kit/zu-store/persist'
import { createUrlPort } from '@ez-kit/zu-store/persist/url'
import { act, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createStore } from 'zustand/vanilla'

import type { Keyed } from '@ez-kit/zu-store/persist'

afterEach(() => {
	vi.useRealTimers()
})

describe('public source policy composition', () => {
	it('saves URL immediately and remote drafts after 500ms through one withPersist', async () => {
		vi.useFakeTimers()
		const panel = createContextStore(() =>
			pipe(
				createStore(() => ({ q: '', draft: '' })),
				withPersist({
					throttleMs: 500,
					write: { sources: { router: { throttleMs: 0 } } },
					restore: { timeoutMs: 20, sources: { remote: { timeoutMs: null } } },
					fields: (field) => [field((s) => s.q, { source: 'router' }), field((s) => s.draft, {})],
				}),
			),
		)
		let params = new URLSearchParams()
		const url = createUrlPort({
			read: () => params,
			commit(next) {
				params = next
			},
		})
		const set = vi.fn((_desired: Keyed) => undefined)
		let store: ReturnType<typeof panel.useStore> | undefined
		function View() {
			store = panel.useStore()
			return null
		}
		render(
			<PersistProvider
				adapters={{
					router: { usePort: () => ({ port: url, changeKey: 'initial' }) },
					remote: { port: { get: () => new Map<string, string>(), set } },
				}}
				defaultSource='remote'
			>
				<panel.Provider>
					<View />
				</panel.Provider>
			</PersistProvider>,
		)
		if (!store) throw new Error('Provider did not expose its store')
		const current = store
		await act(async () => {
			current.setState({ q: 'boots', draft: 'hello' })
			await vi.advanceTimersByTimeAsync(0)
		})
		expect(params.get('q')).toBe('boots')
		expect(set).not.toHaveBeenCalled()
		await act(async () => {
			await vi.advanceTimersByTimeAsync(499)
		})
		expect(set).not.toHaveBeenCalled()
		await act(async () => {
			await vi.advanceTimersByTimeAsync(1)
		})
		expect(set).toHaveBeenCalledTimes(1)
		expect(Array.from(set.mock.calls[0]?.[0].values() ?? [])).toEqual(['hello'])
	})
})
