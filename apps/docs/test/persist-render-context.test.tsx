import { createStoreCache, pipe } from '@ez-kit/zu-store'
import { PersistProvider, withPersist } from '@ez-kit/zu-store/persist'
import { createUrlPort } from '@ez-kit/zu-store/persist/url'
import { render, screen } from '@testing-library/react'
import { Suspense } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { createStore } from 'zustand/vanilla'

describe('uncommitted URL initialization through public bindings', () => {
	it('does not reuse an abandoned seed when the URL changes under the same engines', () => {
		let query = 'q=boots'
		let suspended = true
		const never = new Promise<never>(() => undefined)
		const get = vi.fn(() => new Map<string, string>())
		const url = createUrlPort({ read: () => new URLSearchParams(query), commit: () => undefined })
		const adapters = {
			url: { usePort: () => ({ port: url, changeKey: query }) },
			api: { port: { get, set: () => undefined } },
		}
		const cache = createStoreCache()
		const panel = cache.createCachedStore(
			() =>
				pipe(
					createStore(() => ({ q: '', note: '' })),
					withPersist({ fields: (f) => [f((s) => s.q, { source: 'url' }), f((s) => s.note, { source: 'api' })] }),
				),
			{ name: 'render-panel' },
		)
		const candidates: ReturnType<typeof panel.useStore>[] = []
		function Content() {
			const store = panel.useStore()
			candidates.push(store)
			const q = panel.useSelector((s) => s.q)
			// eslint-disable-next-line @typescript-eslint/only-throw-error -- React Suspense uses thrown promises.
			if (suspended) throw never
			return <span data-testid='query'>{q}</span>
		}
		const tree = () => (
			<PersistProvider adapters={adapters}>
				<cache.Provider>
					<Suspense fallback={<span>loading</span>}>
						<panel.Provider id='one'>
							<Content />
						</panel.Provider>
					</Suspense>
				</cache.Provider>
			</PersistProvider>
		)
		const view = render(tree())
		expect(get).not.toHaveBeenCalled()
		const abandoned = candidates.at(-1)
		expect(abandoned?.getState().q).toBe('boots')
		query = 'q=coat'
		suspended = false
		view.rerender(tree())
		expect(screen.getByTestId('query')).toHaveTextContent('coat')
		expect(candidates.at(-1)).not.toBe(abandoned)
		expect(get).toHaveBeenCalledTimes(1)
	})
})
