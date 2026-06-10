import { useSyncExternalStore } from 'react'

import type { RouterAdapter, SearchParamsHistory } from '../types'

export type FakeRouterAdapter = {
	adapter: RouterAdapter
	/** Simulate an external URL change (back button, another component). */
	setSearch(search: string): void
	getSearch(): string
	calls: { search: string; history: SearchParamsHistory }[]
}

/** In-memory `RouterAdapter` for tests — mimics react-router's reactive read + navigation. */
export function createFakeRouterAdapter(initialSearch = ''): FakeRouterAdapter {
	let current = new URLSearchParams(initialSearch)
	const listeners = new Set<() => void>()
	const calls: { search: string; history: SearchParamsHistory }[] = []

	const notify = (): void => {
		for (const listener of listeners) {
			listener()
		}
	}

	const adapter: RouterAdapter = {
		useSearchParams: () =>
			useSyncExternalStore(
				(onChange) => {
					listeners.add(onChange)
					return () => {
						listeners.delete(onChange)
					}
				},
				() => current,
				() => current,
			),
		useUpdater: () => (next, options) => {
			current = new URLSearchParams(next)
			calls.push({ search: current.toString(), history: options.history })
			notify()
		},
		getSnapshot: () => current,
	}

	return {
		adapter,
		setSearch: (search) => {
			current = new URLSearchParams(search)
			notify()
		},
		getSearch: () => current.toString(),
		calls,
	}
}
