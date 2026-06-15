import { render, screen } from '@testing-library/react'
import { type ReactElement } from 'react'
import { renderToString } from 'react-dom/server'
import { proxy } from 'valtio'
import { describe, expect, it } from 'vitest'

import { type ContextStoreInit } from '../create-context-store'

import { paramString } from './codecs'
import { createPersistFields, createPersistStore } from './create-persist-store'
import { PersistProvider } from './provider'
import { createFakePersistAdapter } from './testing/fake-persist-adapter'
import { persistUrl } from './url/decorator'

type Filters = { q: string }

// Accessor front: plain proxy + fields builder.
const fieldsStore = createPersistFields(
	({ defaultValue }: ContextStoreInit<{ q?: string }>) => proxy<Filters>({ q: defaultValue.q ?? '' }),
	(field) => [field((s) => s.q, { source: 'url', parser: paramString() })],
)

// Decorator front: class instance with `persistUrl` fields, discovered automatically.
class DecoratedFilters {
	@persistUrl() q = ''
}
const decoratedStore = createPersistStore(({ defaultValue }: ContextStoreInit<{ q?: string }>) => {
	const store = proxy(new DecoratedFilters())
	store.q = defaultValue.q ?? ''
	return store
})

function makeView(store: { useSnapshot: () => { q: string } }) {
	return function QView(): ReactElement {
		const snap = store.useSnapshot()
		return <span data-testid='q'>{snap.q}</span>
	}
}

const cases = [
	{ name: 'createPersistFields (accessor)', store: fieldsStore },
	{ name: 'createPersistStore (decorators)', store: decoratedStore },
] as const

describe('@ez-kit/valtio-kit request-scoped persist stores', () => {
	for (const { name, store } of cases) {
		describe(name, () => {
			const QView = makeView(store)

			it('exposes the createContextStore API surface', () => {
				expect(typeof store.Provider).toBe('function')
				expect(typeof store.useStore).toBe('function')
				expect(typeof store.useSnapshot).toBe('function')
				expect(typeof store.Item).toBe('function')
			})

			it('seeds synchronously from the URL on first render (no flash)', () => {
				const fake = createFakePersistAdapter('?q=shoes')
				render(
					<PersistProvider adapters={[fake.adapter]}>
						<store.Provider defaultValue={{ q: 'fallback' }}>
							<QView />
						</store.Provider>
					</PersistProvider>,
				)
				expect(screen.getByTestId('q')).toHaveTextContent('shoes')
			})

			it('falls back to defaultValue when the param is absent', () => {
				const fake = createFakePersistAdapter()
				render(
					<PersistProvider adapters={[fake.adapter]}>
						<store.Provider defaultValue={{ q: 'fallback' }}>
							<QView />
						</store.Provider>
					</PersistProvider>,
				)
				expect(screen.getByTestId('q')).toHaveTextContent('fallback')
			})

			it('renders URL-derived state on the server (renderToString)', () => {
				const fake = createFakePersistAdapter('?q=server')
				const html = renderToString(
					<PersistProvider adapters={[fake.adapter]}>
						<store.Provider defaultValue={{ q: 'fallback' }}>
							<QView />
						</store.Provider>
					</PersistProvider>,
				)
				expect(html).toContain('server')
			})
		})
	}
})
