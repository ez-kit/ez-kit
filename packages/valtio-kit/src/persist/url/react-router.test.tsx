import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { type ReactElement } from 'react'
import { MemoryRouter } from 'react-router'
import { proxy } from 'valtio'
import { describe, expect, it } from 'vitest'

import { paramString } from '../codecs'
import { createPersistFields } from '../create-persist-store'
import { PersistProvider } from '../provider'

import { reactRouterAdapter } from './react-router'

const store = createPersistFields(
	() => proxy({ q: '' }),
	(field) => [field((s) => s.q, { source: 'url', parser: paramString() })],
)

function View(): ReactElement {
	const snap = store.useSnapshot()
	const state = store.useStore()
	return (
		<>
			<span data-testid='q'>{snap.q}</span>
			<button
				type='button'
				onClick={() => {
					// valtio's API is to mutate the proxy directly; that's the intended write path.
					// eslint-disable-next-line react-hooks/immutability
					state.q = 'boots'
				}}
			>
				write
			</button>
		</>
	)
}

describe('@ez-kit/valtio-kit persist reactRouterAdapter', () => {
	it('hydrates from the router location and writes back', async () => {
		render(
			<MemoryRouter initialEntries={['/?q=shoes']}>
				<PersistProvider adapter={reactRouterAdapter}>
					<store.Provider>
						<View />
					</store.Provider>
				</PersistProvider>
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
