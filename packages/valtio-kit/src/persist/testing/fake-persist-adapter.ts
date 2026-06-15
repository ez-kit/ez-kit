import { useSyncExternalStore } from 'react'

import { createUrlPort, URL_SOURCE, UrlHistory, urlMetaMerge } from '../url/adapter'

import type { RenderScopedAdapter } from '../provider'

export type FakePersistAdapter = {
	adapter: RenderScopedAdapter
	/** Simulate an external substrate change (back button, another component, another tab). */
	setSearch(search: string): void
	getSearch(): string
}

/**
 * In-memory render-scoped adapter for tests — mimics a router's reactive read + navigation over the
 * URL source, without depending on react-router. The port is stable; commits notify subscribers so
 * the provider re-renders and pulls.
 */
export function createFakePersistAdapter(initialSearch = ''): FakePersistAdapter {
	let current = new URLSearchParams(initialSearch)
	const listeners = new Set<() => void>()

	const notify = (): void => {
		for (const listener of listeners) {
			listener()
		}
	}

	const port = createUrlPort({
		read: () => new URLSearchParams(current),
		commit: (next) => {
			current = new URLSearchParams(next)
			notify()
		},
	})

	const adapter: RenderScopedAdapter = {
		source: URL_SOURCE,
		mergeMeta: urlMetaMerge,
		defaultMeta: { history: UrlHistory.Replace },
		usePort() {
			const changeKey = useSyncExternalStore(
				(onChange) => {
					listeners.add(onChange)
					return () => {
						listeners.delete(onChange)
					}
				},
				() => current.toString(),
				() => current.toString(),
			)
			return { port, changeKey }
		},
	}

	return {
		adapter,
		setSearch: (search) => {
			current = new URLSearchParams(search)
			notify()
		},
		getSearch: () => current.toString(),
	}
}
