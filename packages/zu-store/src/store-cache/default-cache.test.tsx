import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { createStore } from 'zustand/vanilla'

import { createStoreCache } from './create-store-cache'
import { CacheProvider, createCachedStore } from './default-cache'

import type { CachedStoreOptions } from './types'

type TableState = {
	filter: string
	setFilter: (filter: string) => void
}

const tableFactory = (defaultProps: { filter?: string }) =>
	createStore<TableState>((set) => ({
		filter: defaultProps.filter ?? 'all',
		setFilter: (filter) => {
			set({ filter })
		},
	}))

describe('default cache — top-level exports', () => {
	it('keeps state alive across unmount/remount without calling createStoreCache', () => {
		const table = createCachedStore(tableFactory, { name: 'default-keepalive' })

		function FilterView() {
			return <span data-testid='r'>{table.useStore((s) => s.filter)}</span>
		}
		function ArchiveButton() {
			const setFilter = table.useStore((s) => s.setFilter)
			return (
				<button
					type='button'
					onClick={() => {
						setFilter('archived')
					}}
				>
					archive
				</button>
			)
		}
		function App({ show }: { show: boolean }) {
			return (
				<CacheProvider>
					{show ? (
						<table.Provider
							id='main'
							defaultProps={{ filter: 'active' }}
						>
							<FilterView />
							<ArchiveButton />
						</table.Provider>
					) : (
						<span data-testid='hidden'>hidden</span>
					)}
				</CacheProvider>
			)
		}

		const { rerender } = render(<App show />)
		expect(screen.getByTestId('r')).toHaveTextContent('active')

		fireEvent.click(screen.getByRole('button', { name: 'archive' }))
		expect(screen.getByTestId('r')).toHaveTextContent('archived')

		rerender(<App show={false} />)
		rerender(<App show />)
		expect(screen.getByTestId('r')).toHaveTextContent('archived')
	})

	it('binds default-cache groups to the default cache, not a custom one', () => {
		// A group created with the top-level (default-cache) creator is bound to the default cache.
		// Mounting it under a *custom* createStoreCache() provider (no CacheProvider ancestor) must throw.
		const table = createCachedStore(tableFactory, { name: 'default-binding' })
		const custom = createStoreCache()

		function Consumer() {
			table.useStore((s) => s.filter)
			return null
		}

		expect(() =>
			render(
				<custom.Provider>
					<table.Provider id='x'>
						<Consumer />
					</table.Provider>
				</custom.Provider>,
			),
		).toThrowError('Missing StoreCacheProvider')
	})
})

// Type-level checks (not executed) — `name` is required in CachedStoreOptions.
function _typeChecks(): void {
	// @ts-expect-error name is required
	const _missingName: CachedStoreOptions = { gcTime: 1000 }
	// @ts-expect-error options is required (no bare factory call)
	createCachedStore(tableFactory)
	void _missingName
}
void _typeChecks
