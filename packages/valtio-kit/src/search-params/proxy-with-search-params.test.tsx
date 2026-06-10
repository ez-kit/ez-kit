import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { type ReactElement } from 'react'
import { useSnapshot } from 'valtio'
import { beforeEach, describe, expect, it } from 'vitest'

import { paramString } from './codecs'
import { clearRegistry } from './engine/registry'
import { StoreSearchParamsProvider } from './provider'
import { proxyWithSearchParams } from './proxy-with-search-params'
import { createFakeRouterAdapter, type FakeRouterAdapter } from './testing/fake-router-adapter'

function makeStore() {
	return proxyWithSearchParams({ q: '' }, { fields: { q: paramString() } })
}

function withProvider(fake: FakeRouterAdapter, ui: ReactElement): ReactElement {
	return <StoreSearchParamsProvider adapter={fake.adapter}>{ui}</StoreSearchParamsProvider>
}

describe('@ez-kit/valtio-kit proxyWithSearchParams', () => {
	beforeEach(() => {
		clearRegistry()
	})

	it('hydrates from the URL on mount (URL wins over default)', async () => {
		const fake = createFakeRouterAdapter('?q=shoes')
		const store = makeStore()
		function View(): ReactElement {
			const snap = useSnapshot(store)
			return <span data-testid='q'>{snap.q}</span>
		}

		render(withProvider(fake, <View />))

		await waitFor(() => { expect(screen.getByTestId('q')).toHaveTextContent('shoes'); })
	})

	it('writes proxy mutations to the URL, visible to a useSearchParams consumer', async () => {
		const fake = createFakeRouterAdapter()
		const store = makeStore()
		function UrlProbe(): ReactElement {
			const params = fake.adapter.useSearchParams()
			return <span data-testid='url-q'>{params.get('q') ?? ''}</span>
		}
		function WriteButton(): ReactElement {
			return (
				<button type='button' onClick={() => (store.q = 'boots')}>
					write
				</button>
			)
		}

		render(withProvider(fake, <><UrlProbe /><WriteButton /></>))

		fireEvent.click(screen.getByRole('button', { name: 'write' }))

		await waitFor(() => { expect(screen.getByTestId('url-q')).toHaveTextContent('boots'); })
	})

	it('pulls an external URL change into the proxy', async () => {
		const fake = createFakeRouterAdapter('?q=initial')
		const store = makeStore()
		function View(): ReactElement {
			const snap = useSnapshot(store)
			return <span data-testid='q'>{snap.q}</span>
		}

		render(withProvider(fake, <View />))
		await waitFor(() => { expect(screen.getByTestId('q')).toHaveTextContent('initial'); })

		act(() => {
			fake.setSearch('?q=external')
		})

		await waitFor(() => { expect(screen.getByTestId('q')).toHaveTextContent('external'); })
	})

	it('$searchParams.push tags the navigation as a history push', async () => {
		const fake = createFakeRouterAdapter()
		const store = makeStore()
		function PushButton(): ReactElement {
			return (
				<button
					type='button'
					onClick={() =>
						{ store.$searchParams.push(() => {
							store.q = 'pushed'
						}); }
					}
				>
					push
				</button>
			)
		}

		render(withProvider(fake, <PushButton />))
		fireEvent.click(screen.getByRole('button', { name: 'push' }))

		await waitFor(() => { expect(fake.calls.at(-1)?.history).toBe('push'); })
		expect(fake.getSearch()).toBe('q=pushed')
	})
})
