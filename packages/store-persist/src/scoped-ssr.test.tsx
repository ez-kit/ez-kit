// @vitest-environment node
import { useCapabilities, useServices } from '@ez-kit/store-core/react'
import { useRef } from 'react'
import { renderToString } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import { paramString } from './codecs'
import { useHydrated } from './plugin'
import { PersistProvider } from './provider'
import { objectPort, observable } from './test-kit'
import { createUrlPort } from './url/adapter'
import { applyPersist } from './with-persist'

describe('scoped persistence SSR', () => {
	it('seeds only the request URL and does no ambient I/O or mutations', () => {
		const commit = vi.fn()
		const url = createUrlPort({ read: () => new URLSearchParams('q=boots'), commit })
		const read = vi.spyOn(url, 'get')
		const ambient = { get: vi.fn(() => new Map<string, string>()), set: vi.fn() }
		const adapters = { url: { usePort: () => ({ port: url, changeKey: 'q=boots' }) }, server: { port: ambient } }
		function View() {
			const ref = useRef<{ q: string; note: string } | null>(null)
			if (ref.current === null) {
				ref.current = observable({ q: '', note: 'default' })
				applyPersist<{ q: string; note: string }, { q: string; note: string }>(ref.current, objectPort, {
					fields: (field) => [
						field((state) => state.q, { source: 'url', parser: paramString() }),
						field((state) => state.note, { source: 'server' }),
					],
				})
			}
			const store = ref.current
			useCapabilities(store, useServices(), { path: ['devices'], name: 'ssr', id: 'workspace' })
			return (
				<span>
					{store.q}:{store.note}:{String(useHydrated(store))}
				</span>
			)
		}
		for (let request = 0; request < 2; request++) {
			expect(
				renderToString(
					<PersistProvider adapters={adapters}>
						<View />
					</PersistProvider>,
				),
			).toContain('boots')
		}
		expect(read).toHaveBeenCalledTimes(2)
		expect(ambient.get).not.toHaveBeenCalled()
		expect(ambient.set).not.toHaveBeenCalled()
		expect(commit).not.toHaveBeenCalled()
	})
})
