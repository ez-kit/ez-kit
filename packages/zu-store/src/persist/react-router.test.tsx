import { pipe } from '@ez-kit/store-core'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { type ReactElement } from 'react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { createStore } from 'zustand/vanilla'

import { createContextStore } from '../create-context-store'
import { StoreProvider } from '../store-provider'

import { reactRouterAdapter } from './url/react-router'

import { paramString, withPersist } from './index'

import type { StoreApi } from 'zustand/vanilla'

type Filters = { q: string }

const store = createContextStore<StoreApi<Filters>>(() =>
	pipe(
		createStore<Filters>()(() => ({ q: '' })),
		withPersist<StoreApi<Filters>>({
			fields: (field) => [field((state) => state.q, { source: 'url', parser: paramString() })],
		}),
	),
)

function View(): ReactElement {
	const q = store.useSelector((state) => state.q)
	const handle = store.useStore()
	return (
		<>
			<span data-testid='q'>{q}</span>
			<button
				type='button'
				onClick={() => {
					handle.setState({ q: 'boots' })
				}}
			>
				write
			</button>
		</>
	)
}

describe('@ez-kit/zu-store persist reactRouterAdapter', () => {
	it('hydrates from the router location and writes back', async () => {
		render(
			<MemoryRouter initialEntries={['/?q=shoes']}>
				<StoreProvider persist={[reactRouterAdapter]}>
					<store.Provider>
						<View />
					</store.Provider>
				</StoreProvider>
			</MemoryRouter>,
		)

		await waitFor(() => {
			expect(screen.getByTestId('q')).toHaveTextContent('shoes')
		})

		fireEvent.click(screen.getByRole('button', { name: 'write' }))
		await waitFor(() => {
			expect(screen.getByTestId('q')).toHaveTextContent('boots')
		})
	})
})
