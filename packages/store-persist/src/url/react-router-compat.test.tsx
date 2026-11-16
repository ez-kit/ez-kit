import { act, render, renderHook, screen } from '@testing-library/react'
import { createMemoryRouter, MemoryRouter, RouterProvider, useRouteError } from 'react-router'
import { describe, expect, it, vi } from 'vitest'

import type * as ReactRouterTypes from 'react-router'

vi.mock('react-router', async (importOriginal) => {
	const original = await importOriginal<typeof ReactRouterTypes>()
	const older = { ...original }
	Reflect.deleteProperty(older, 'UNSAFE_DataRouterContext')
	return older
})
const { reactRouterAdapter } = await import('./react-router')

describe('optional data-router integration capabilities', () => {
	it('keeps basic routers usable when the older peer lacks the optional data-router export', async () => {
		const view = renderHook(() => reactRouterAdapter.usePort(), {
			wrapper: ({ children }) => <MemoryRouter initialEntries={['/?q=initial']}>{children}</MemoryRouter>,
		})
		expect(view.result.current.port.getRenderSnapshot?.().get('q')).toBe('initial')
		await act(async () => {
			await view.result.current.port.set(new Map([['q', 'next']]), {
				fields: [],
				diff: { set: ['q'], removed: [] },
				meta: {},
			})
		})
		expect(view.result.current.port.get().get('q')).toBe('next')
		view.unmount()
	})

	it('diagnoses a data router whose exported observation context is missing', () => {
		function View() {
			reactRouterAdapter.usePort()
			return null
		}
		function Boundary() {
			return <span>{String(useRouteError())}</span>
		}
		const router = createMemoryRouter([{ path: '/', element: <View />, errorElement: <Boundary /> }])
		const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)
		try {
			const view = render(<RouterProvider router={router} />)
			expect(screen.getByText(/data navigation acknowledgement is unavailable/)).toBeInTheDocument()
			view.unmount()
		} finally {
			error.mockRestore()
			router.dispose()
		}
	})
})
