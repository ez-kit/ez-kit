import { act, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createCacheReact } from './create-cache-react'

import type { StorePlugin } from '../plugin'
import type { ReactElement } from 'react'

type Fake = { id: string }

/** Fake read primitive: synchronously project the instance through the selector. */
function useFakeRead<S>(instance: Fake, selector: (snap: unknown) => S): S {
	return selector(instance)
}

// Re-create a fresh API per test to isolate group-name registration and the active-cache ref.
function freshApi() {
	return createCacheReact<Fake>({ useRead: useFakeRead }, { gcTime: 1000 })
}

describe('createCacheReact', () => {
	beforeEach(() => {
		vi.useFakeTimers()
	})
	afterEach(() => {
		vi.useRealTimers()
	})

	it('binds a plugin once across unmount/remount within gcTime, cleaning up only on eviction', () => {
		const api = freshApi()
		const setup = vi.fn(() => cleanup)
		const cleanup = vi.fn()
		const plugins: StorePlugin<Fake>[] = [{ name: 'p', setup }]
		const group = api.createCachedStore<{ id: string }>((init) => ({ id: init.defaultValue.id }), {
			name: 'fake',
			plugins,
		})

		// Keep the cache Provider mounted across renders; toggle only the group Provider child.
		function Tree({ show }: { show: boolean }): ReactElement {
			return (
				<api.Provider>
					{show ? (
						<group.Provider
							id='x'
							defaultValue={{ id: 'x' }}
						>
							<group.Item selector={(snap) => (snap as Fake).id}>{(value) => <span>{value}</span>}</group.Item>
						</group.Provider>
					) : null}
				</api.Provider>
			)
		}

		const view = render(<Tree show={true} />)
		expect(setup).toHaveBeenCalledTimes(1)

		// Unmount the group provider but keep the cache provider mounted.
		act(() => {
			view.rerender(<Tree show={false} />)
		})
		// Within gcTime: no cleanup yet.
		act(() => {
			vi.advanceTimersByTime(500)
		})
		expect(cleanup).not.toHaveBeenCalled()

		// Remount the same id within gcTime → cache hit, no new setup.
		act(() => {
			view.rerender(<Tree show={true} />)
		})
		expect(setup).toHaveBeenCalledTimes(1)
		expect(cleanup).not.toHaveBeenCalled()
	})

	it('runs plugin cleanup on eviction after the provider unmounts past gcTime', () => {
		const api = freshApi()
		const cleanup = vi.fn()
		const setup = vi.fn(() => cleanup)
		const group = api.createCachedStore<{ id: string }>((init) => ({ id: init.defaultValue.id }), {
			name: 'fake',
			plugins: [{ name: 'p', setup }],
		})

		const view = render(
			<api.Provider>
				<group.Provider
					id='x'
					defaultValue={{ id: 'x' }}
				>
					<span>child</span>
				</group.Provider>
			</api.Provider>,
		)

		act(() => {
			view.rerender(<api.Provider>{null}</api.Provider>)
		})
		expect(cleanup).not.toHaveBeenCalled()

		act(() => {
			vi.advanceTimersByTime(1000)
		})
		expect(cleanup).toHaveBeenCalledTimes(1)
	})

	it('accumulates nested Scope paths into the StoreId path', () => {
		const api = freshApi()
		const seen: string[][] = []
		const group = api.createCachedStore<{ id: string }>((init) => ({ id: init.defaultValue.id }), {
			name: 'fake',
			plugins: [
				{
					name: 'capture',
					setup: (_instance, ctx) => {
						seen.push([...ctx.id.path])
						return undefined
					},
				},
			],
		})

		render(
			<api.Provider>
				<api.Scope path={['org']}>
					<api.Scope path={['acme']}>
						<group.Provider
							id='x'
							path={['team']}
							defaultValue={{ id: 'x' }}
						>
							<span>child</span>
						</group.Provider>
					</api.Scope>
				</api.Scope>
			</api.Provider>,
		)

		expect(seen).toEqual([['org', 'acme', 'team']])
	})

	it('exposes live entries through useCacheKeys', () => {
		const api = freshApi()
		const group = api.createCachedStore<{ id: string }>((init) => ({ id: init.defaultValue.id }), { name: 'fake' })

		function Keys(): ReactElement {
			const keys = api.useCacheKeys()
			return <span data-testid='keys'>{JSON.stringify(keys)}</span>
		}

		const view = render(
			<api.Provider>
				<group.Provider
					id='x'
					defaultValue={{ id: 'x' }}
				>
					<span>child</span>
				</group.Provider>
				<Keys />
			</api.Provider>,
		)

		expect(JSON.parse(view.getByTestId('keys').textContent)).toEqual([{ path: [], name: 'fake', id: 'x' }])
	})
})
