import { render, screen } from '@testing-library/react'
import { type ReactElement } from 'react'
import { renderToString } from 'react-dom/server'
import { proxy } from 'valtio'
import { describe, expect, it } from 'vitest'

import { type ContextStoreInit } from '../create-context-store'

import { paramString } from './codecs'
import { createDecoratedStore, createFieldsStore } from './create-search-params-store'
import { searchParam } from './decorators'
import { StoreSearchParamsProvider } from './provider'
import { createFakeRouterAdapter } from './testing/fake-router-adapter'

type Filters = { q: string }

// Accessor front: plain proxy + required `fields` builder.
const fieldsStore = createFieldsStore(
	({ defaultValue }: ContextStoreInit<{ q?: string }>) => proxy<Filters>({ q: defaultValue.q ?? '' }),
	(field) => [field((s) => s.q, paramString())],
)

// Decorator front: class instance with `@searchParam` fields, discovered automatically.
class DecoratedFilters {
	@searchParam() q = ''
}
const decoratedStore = createDecoratedStore(
	({ defaultValue }: ContextStoreInit<{ q?: string }>) => {
		const store = proxy(new DecoratedFilters())
		store.q = defaultValue.q ?? ''
		return store
	},
)

function makeView(store: { useSnapshot: () => { q: string } }) {
	return function QView(): ReactElement {
		const snap = store.useSnapshot()
		return <span data-testid='q'>{snap.q}</span>
	}
}

const cases = [
	{ name: 'createFieldsStore (accessor)', store: fieldsStore },
	{ name: 'createDecoratedStore (decorators)', store: decoratedStore },
] as const

describe('@ez-kit/valtio-kit request-scoped search-params stores', () => {
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
				const fake = createFakeRouterAdapter('?q=shoes')
				render(
					<StoreSearchParamsProvider adapter={fake.adapter}>
						<store.Provider defaultValue={{ q: 'fallback' }}>
							<QView />
						</store.Provider>
					</StoreSearchParamsProvider>,
				)
				// URL wins over defaultValue, and it is correct on the very first render.
				expect(screen.getByTestId('q')).toHaveTextContent('shoes')
			})

			it('falls back to defaultValue when the param is absent', () => {
				const fake = createFakeRouterAdapter()
				render(
					<StoreSearchParamsProvider adapter={fake.adapter}>
						<store.Provider defaultValue={{ q: 'fallback' }}>
							<QView />
						</store.Provider>
					</StoreSearchParamsProvider>,
				)
				expect(screen.getByTestId('q')).toHaveTextContent('fallback')
			})

			it('renders URL-derived state on the server (renderToString)', () => {
				const fake = createFakeRouterAdapter('?q=server')
				const html = renderToString(
					<StoreSearchParamsProvider adapter={fake.adapter}>
						<store.Provider defaultValue={{ q: 'fallback' }}>
							<QView />
						</store.Provider>
					</StoreSearchParamsProvider>,
				)
				expect(html).toContain('server')
			})
		})
	}
})
