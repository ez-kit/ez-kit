import { render, screen } from '@testing-library/react'
import { type ReactElement } from 'react'
import { renderToString } from 'react-dom/server'
import { proxy } from 'valtio'
import { describe, expect, it } from 'vitest'

import { type ContextStoreInit } from '../create-context-store'

import { paramString } from './codecs'
import { createSearchParamsStore } from './create-search-params-store'
import { StoreSearchParamsProvider } from './provider'
import { createFakeRouterAdapter } from './testing/fake-router-adapter'

type Filters = { q: string }

const filters = createSearchParamsStore(
	({ defaultValue }: ContextStoreInit<{ q?: string }>) => proxy<Filters>({ q: defaultValue.q ?? '' }),
	{ fields: { q: paramString() } },
)

function QView(): ReactElement {
	const snap = filters.useSnapshot()
	return <span data-testid='q'>{snap.q}</span>
}

describe('@ez-kit/valtio-kit createSearchParamsStore', () => {
	it('exposes the createContextStore API surface', () => {
		expect(typeof filters.Provider).toBe('function')
		expect(typeof filters.useStore).toBe('function')
		expect(typeof filters.useSnapshot).toBe('function')
		expect(typeof filters.Item).toBe('function')
	})

	it('seeds synchronously from the URL on first render (no flash)', () => {
		const fake = createFakeRouterAdapter('?q=shoes')
		render(
			<StoreSearchParamsProvider adapter={fake.adapter}>
				<filters.Provider defaultValue={{ q: 'fallback' }}>
					<QView />
				</filters.Provider>
			</StoreSearchParamsProvider>,
		)
		// URL wins over defaultValue, and it is correct on the very first render.
		expect(screen.getByTestId('q')).toHaveTextContent('shoes')
	})

	it('falls back to defaultValue when the param is absent', () => {
		const fake = createFakeRouterAdapter()
		render(
			<StoreSearchParamsProvider adapter={fake.adapter}>
				<filters.Provider defaultValue={{ q: 'fallback' }}>
					<QView />
				</filters.Provider>
			</StoreSearchParamsProvider>,
		)
		expect(screen.getByTestId('q')).toHaveTextContent('fallback')
	})

	it('renders URL-derived state on the server (renderToString)', () => {
		const fake = createFakeRouterAdapter('?q=server')
		const html = renderToString(
			<StoreSearchParamsProvider adapter={fake.adapter}>
				<filters.Provider defaultValue={{ q: 'fallback' }}>
					<QView />
				</filters.Provider>
			</StoreSearchParamsProvider>,
		)
		expect(html).toContain('server')
	})
})
