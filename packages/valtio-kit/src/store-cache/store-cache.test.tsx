import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { renderToString } from 'react-dom/server'
import { proxy } from 'valtio'
import { describe, expect, it } from 'vitest'

import { createStoreCache } from './create-store-cache'

import type { StoreInit } from '../create-store'

type FormState = {
	dirty: boolean
	name: string
}

type FormDefaultValue = { dirty?: boolean; name?: string }

const formFactory = ({ defaultValue }: StoreInit<FormDefaultValue>) =>
	proxy<FormState>({
		dirty: defaultValue.dirty ?? false,
		name: defaultValue.name ?? '',
	})

describe('valtio createStoreCache — surface', () => {
	it('returns the zu-store-equivalent shape', () => {
		const cache = createStoreCache()
		expect(typeof cache.Provider).toBe('function')
		expect(typeof cache.Scope).toBe('function')
		expect(typeof cache.useCache).toBe('function')
		expect(typeof cache.useCacheKeys).toBe('function')
		expect(typeof cache.createCachedStore).toBe('function')
	})

	it('reads selected state through useSnapshot and re-renders on mutation', async () => {
		const cache = createStoreCache()
		const form = cache.createCachedStore(formFactory, { name: 'surface-read' })

		function NameView() {
			const snap = form.useSnapshot()
			return <span data-testid='name'>{snap.name}</span>
		}
		function RenameButton() {
			const store = form.useStore()
			return (
				<button
					type='button'
					onClick={() => {
						store.name = 'Ann'
					}}
				>
					rename
				</button>
			)
		}

		render(
			<cache.Provider>
				<form.Provider
					id='main'
					defaultValue={{ name: 'seed' }}
				>
					<NameView />
					<RenameButton />
				</form.Provider>
			</cache.Provider>,
		)

		expect(screen.getByTestId('name')).toHaveTextContent('seed')
		fireEvent.click(screen.getByRole('button', { name: 'rename' }))
		await waitFor(() => {
			expect(screen.getByTestId('name')).toHaveTextContent('Ann')
		})
	})

	it('exposes { snap, store } via the Item render-prop', () => {
		const cache = createStoreCache()
		const form = cache.createCachedStore(formFactory, { name: 'surface-item' })

		render(
			<cache.Provider>
				<form.Provider
					id='main'
					defaultValue={{ name: 'render-prop' }}
				>
					<form.Item>{({ snap }) => <span data-testid='item'>{snap.name}</span>}</form.Item>
				</form.Provider>
			</cache.Provider>,
		)

		expect(screen.getByTestId('item')).toHaveTextContent('render-prop')
	})
})

describe('valtio createStoreCache — cache-hit returns same live proxy', () => {
	it('preserves in-progress mutations across unmount/remount within gcTime', async () => {
		const cache = createStoreCache({ gcTime: 10_000 })
		const form = cache.createCachedStore(formFactory, { name: 'reuse-1' })

		function NameView() {
			const snap = form.useSnapshot()
			return <span data-testid='name'>{`${snap.name}:${String(snap.dirty)}`}</span>
		}
		function DirtyButton() {
			const store = form.useStore()
			return (
				<button
					type='button'
					onClick={() => {
						store.dirty = true
						store.name = 'Ann'
					}}
				>
					dirty
				</button>
			)
		}

		function App({ show }: { show: boolean }) {
			return (
				<cache.Provider>
					{show ? (
						<form.Provider
							id='form'
							defaultValue={{ name: '', dirty: false }}
						>
							<NameView />
							<DirtyButton />
						</form.Provider>
					) : (
						<span>hidden</span>
					)}
				</cache.Provider>
			)
		}

		const { rerender } = render(<App show={true} />)
		fireEvent.click(screen.getByRole('button', { name: 'dirty' }))
		await waitFor(() => {
			expect(screen.getByTestId('name')).toHaveTextContent('Ann:true')
		})

		// Unmount the form provider (cache.Provider stays mounted; entry kept alive within gcTime).
		rerender(<App show={false} />)
		expect(screen.queryByTestId('name')).toBeNull()

		// Remount with a different defaultValue — the preserved proxy must win.
		rerender(<App show={true} />)
		expect(screen.getByTestId('name')).toHaveTextContent('Ann:true')
	})

	it('ignores a different defaultValue on reuse and returns the same proxy', () => {
		const cache = createStoreCache({ gcTime: 10_000 })
		const form = cache.createCachedStore(formFactory, { name: 'reuse-2' })

		function NameView() {
			return <span data-testid='name'>{form.useSnapshot().name}</span>
		}
		function App({ show, seed }: { show: boolean; seed: string }) {
			return (
				<cache.Provider>
					{show ? (
						<form.Provider
							id='form'
							defaultValue={{ name: seed }}
						>
							<NameView />
						</form.Provider>
					) : null}
				</cache.Provider>
			)
		}

		const { rerender } = render(
			<App
				show={true}
				seed='first'
			/>,
		)
		expect(screen.getByTestId('name')).toHaveTextContent('first')
		const live = form.fromCache({ id: 'form' })

		rerender(
			<App
				show={false}
				seed='first'
			/>,
		)
		rerender(
			<App
				show={true}
				seed='second'
			/>,
		)

		expect(screen.getByTestId('name')).toHaveTextContent('first')
		expect(form.fromCache({ id: 'form' })).toBe(live)
	})

	it('seeds a fresh proxy from defaultValue after the entry is evicted', async () => {
		const cache = createStoreCache({ gcTime: 1000 })
		const form = cache.createCachedStore(formFactory, { name: 'reuse-evict' })

		function NameView() {
			return <span data-testid='name'>{form.useSnapshot().name}</span>
		}
		function App({ show, seed }: { show: boolean; seed: string }) {
			return (
				<cache.Provider>
					{show ? (
						<form.Provider
							id='form'
							defaultValue={{ name: seed }}
						>
							<NameView />
						</form.Provider>
					) : null}
				</cache.Provider>
			)
		}

		const { rerender } = render(
			<App
				show={true}
				seed='first'
			/>,
		)
		expect(screen.getByTestId('name')).toHaveTextContent('first')

		// Unmount the form provider, then wait past gcTime so the unobserved entry is evicted.
		rerender(
			<App
				show={false}
				seed='first'
			/>,
		)
		await act(async () => {
			await new Promise((resolve) => setTimeout(resolve, 1100))
		})
		expect(form.fromCache({ id: 'form' })).toBeUndefined()

		// Remount: the entry is gone, so the new defaultValue seeds a fresh proxy.
		rerender(
			<App
				show={true}
				seed='second'
			/>,
		)
		expect(screen.getByTestId('name')).toHaveTextContent('second')
	})
})

describe('valtio createStoreCache — SSR ephemerality', () => {
	it('renders seeded state on the server and exposes no live cache', () => {
		const cache = createStoreCache()
		const form = cache.createCachedStore(formFactory, { name: 'ssr-1' })

		function Reader() {
			return <span>{form.useSnapshot().name}</span>
		}

		const html = renderToString(
			<cache.Provider>
				<cache.Scope path={['page-1']}>
					<form.Provider
						id='main'
						defaultValue={{ name: 'server-seed' }}
					>
						<Reader />
					</form.Provider>
				</cache.Scope>
			</cache.Provider>,
		)

		expect(html).toContain('server-seed')
		expect(form.fromCache({ path: ['page-1'], id: 'main' })).toBeUndefined()
	})

	it('does not share state across separate server renders', () => {
		const cache = createStoreCache()
		const form = cache.createCachedStore(formFactory, { name: 'ssr-2' })

		function Reader() {
			return <span>{form.useSnapshot().name}</span>
		}

		const one = renderToString(
			<cache.Provider>
				<form.Provider
					id='main'
					defaultValue={{ name: 'first' }}
				>
					<Reader />
				</form.Provider>
			</cache.Provider>,
		)
		const two = renderToString(
			<cache.Provider>
				<form.Provider
					id='main'
					defaultValue={{ name: 'second' }}
				>
					<Reader />
				</form.Provider>
			</cache.Provider>,
		)

		expect(one).toContain('first')
		expect(two).toContain('second')
	})
})
