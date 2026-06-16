'use client'

import { createUrlPort, URL_SOURCE, UrlHistory, urlMetaMerge } from '@ez-kit/valtio-kit/persist/url'
import { useRef, useSyncExternalStore } from 'react'

import type { RenderScopedAdapter, SyncSourcePort } from '@ez-kit/valtio-kit/persist'

/**
 * A self-contained, in-memory URL adapter for the live docs examples.
 *
 * The real adapters (`reactRouterAdapter`, `nextAdapter`) drive the browser URL. Inside the docs we
 * don't want a demo to hijack the page's address bar, so each example gets its own isolated memory
 * adapter and renders the resulting query string itself. Swapping this for `nextAdapter` or
 * `reactRouterAdapter` is the only change needed in a real app.
 */
export type MemoryUrlAdapter = {
	adapter: RenderScopedAdapter
	/** Reactive read of the current query string, for the example's URL read-out. */
	useSearch: () => string
}

export function createMemoryUrlAdapter(initial = ''): MemoryUrlAdapter {
	let search = initial
	const listeners = new Set<() => void>()

	const subscribe = (listener: () => void): (() => void) => {
		listeners.add(listener)
		return () => {
			listeners.delete(listener)
		}
	}
	const getSearch = (): string => search
	const emit = (): void => {
		for (const listener of listeners) {
			listener()
		}
	}

	const adapter: RenderScopedAdapter = {
		source: URL_SOURCE,
		mergeMeta: urlMetaMerge,
		defaultMeta: { history: UrlHistory.Replace },

		usePort() {
			const portRef = useRef<SyncSourcePort | null>(null)
			portRef.current ??= createUrlPort({
				read: () => new URLSearchParams(search),
				commit: (next) => {
					search = next.toString()
					emit()
				},
			})
			// `changeKey` changes whenever the substrate changes externally, driving the provider's pull.
			const changeKey = useSyncExternalStore(subscribe, getSearch, getSearch)
			return { port: portRef.current, changeKey }
		},
	}

	const useSearch = (): string => useSyncExternalStore(subscribe, getSearch, getSearch)

	return { adapter, useSearch }
}

/** Shared chrome for the URL read-out shown under each live example. */
export function UrlReadout({ search }: { search: string }) {
	return (
		<div className='mt-3 rounded-md border border-fd-border bg-fd-muted/40 px-3 py-2 font-mono text-xs'>
			<span className='text-fd-muted-foreground'>URL&nbsp;</span>
			<span className='break-all'>?{search || <span className='text-fd-muted-foreground'>(empty)</span>}</span>
		</div>
	)
}
