import { act, fireEvent, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { Mutation } from './mutation'
import { deferred, ErrorBoundary, renderWithClient } from './test-kit'

import type { ReactNode } from 'react'

describe('Mutation', () => {
	it('keeps its UI mounted through idle, pending and success without re-rendering its parent or sibling', async () => {
		const request = deferred<string>()
		const onSuccess = vi.fn()
		const mutationFn = vi.fn((_id: number) => request.promise)
		let parentRenders = 0
		let siblingRenders = 0
		function Parent(): ReactNode {
			parentRenders += 1
			return (
				<>
					<Mutation mutation={{ mutationFn, onSuccess }}>
						{(m) => (
							<button
								disabled={m.isPending}
								onClick={() => {
									m.mutate(7)
								}}
							>
								{m.status}: {m.data ?? 'empty'}
								{m.variables}
							</button>
						)}
					</Mutation>
					<Mutation mutation={{ mutationFn: () => Promise.resolve('sibling') }}>
						{() => {
							siblingRenders += 1
							return null
						}}
					</Mutation>
				</>
			)
		}
		const { client } = renderWithClient(<Parent />)
		const button = screen.getByRole('button', { name: 'idle: empty' })
		fireEvent.click(button)
		expect(await screen.findByRole('button', { name: 'pending: empty7' })).toBe(button)
		expect(button).toBeDisabled()
		await act(async () => {
			request.resolve('saved')
			await request.promise
		})
		expect(await screen.findByRole('button', { name: 'success: saved7' })).toBe(button)
		expect(button).toBeEnabled()
		expect(mutationFn).toHaveBeenCalledTimes(1)
		expect(mutationFn.mock.calls[0]?.[0]).toBe(7)
		expect(onSuccess).toHaveBeenCalledTimes(1)
		expect(client.getMutationCache().getAll()[0]?.state.data).toBe('saved')
		expect(parentRenders).toBe(1)
		expect(siblingRenders).toBe(1)
	})

	it('leaves errors in the render result and exposes reset', async () => {
		const error = new Error('Save failed')
		const onError = vi.fn<(error: Error) => void>()
		renderWithClient(
			<Mutation mutation={{ mutationFn: () => Promise.reject(error), onError }}>
				{(m) => (
					<>
						<button
							onClick={() => {
								m.mutate()
							}}
						>
							Save
						</button>
						<button
							onClick={() => {
								m.reset()
							}}
						>
							Reset
						</button>
						<span>{m.error?.message ?? m.status}</span>
					</>
				)}
			</Mutation>,
		)
		fireEvent.click(screen.getByText('Save'))
		expect(await screen.findByText('Save failed')).toBeInTheDocument()
		expect(onError.mock.calls[0]?.[0]).toBe(error)
		expect(screen.getByText('Save')).toBeInTheDocument()
		fireEvent.click(screen.getByText('Reset'))
		expect(await screen.findByText('idle')).toBeInTheDocument()
	})

	it('preserves mutateAsync return values', async () => {
		const received = vi.fn()
		renderWithClient(
			<Mutation mutation={{ mutationFn: (id: number) => Promise.resolve({ id }) }}>
				{(m) => (
					<button
						onClick={() => {
							void m.mutateAsync(3).then(received)
						}}
					>
						Save
					</button>
				)}
			</Mutation>,
		)
		fireEvent.click(screen.getByText('Save'))
		await vi.waitFor(() => {
			expect(received).toHaveBeenCalledWith({ id: 3 })
		})
	})

	it('honors native throwOnError', async () => {
		const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
		try {
			renderWithClient(
				<ErrorBoundary fallback={() => <span>boundary</span>}>
					<Mutation mutation={{ mutationFn: () => Promise.reject(new Error('failed')), throwOnError: true }}>
						{(m) => (
							<button
								onClick={() => {
									m.mutate()
								}}
							>
								Save
							</button>
						)}
					</Mutation>
				</ErrorBoundary>,
			)
			fireEvent.click(screen.getByText('Save'))
			expect(await screen.findByText('boundary')).toBeInTheDocument()
		} finally {
			consoleError.mockRestore()
		}
	})
})
