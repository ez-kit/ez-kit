import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { type ReactElement } from 'react'
import { MemoryRouter } from 'react-router'
import { useSnapshot } from 'valtio'
import { beforeEach, describe, expect, it } from 'vitest'

import { paramString } from '../codecs'
import { clearRegistry } from '../engine/registry'
import { StoreSearchParamsProvider } from '../provider'
import { proxyWithSearchParams } from '../proxy-with-search-params'

import { reactRouterAdapter } from './react-router'

describe('@ez-kit/valtio-kit reactRouterAdapter', () => {
	beforeEach(() => {
		clearRegistry()
	})

	it('hydrates from the router location and writes back', async () => {
		const store = proxyWithSearchParams({ q: '' }, { fields: { q: paramString() } })

		function View(): ReactElement {
			const snap = useSnapshot(store)
			return (
				<>
					<span data-testid='q'>{snap.q}</span>
					<button type='button' onClick={() => (store.q = 'boots')}>
						write
					</button>
				</>
			)
		}

		render(
			<MemoryRouter initialEntries={['/?q=shoes']}>
				<StoreSearchParamsProvider adapter={reactRouterAdapter}>
					<View />
				</StoreSearchParamsProvider>
			</MemoryRouter>,
		)

		await waitFor(() => { expect(screen.getByTestId('q')).toHaveTextContent('shoes'); })

		fireEvent.click(screen.getByRole('button', { name: 'write' }))
		await waitFor(() => { expect(screen.getByTestId('q')).toHaveTextContent('boots'); })
	})
})
