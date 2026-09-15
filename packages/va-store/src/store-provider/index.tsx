import { type ReactElement, type ReactNode } from 'react'

import { PersistProvider, type PersistAdapter } from '../persist'

import type { StoreCache } from '../store-cache'

/**
 * App-level composition root for va-store stores. Mounts the persist engines (one per source — single
 * writer, no races) and/or a store cache once at the top of the tree, so descendant `persist()` plugins
 * can resolve the {@link PersistProvider}-published engines service and cached stores share that one cache.
 *
 * Composition (outermost → innermost): `PersistProvider(persist) ∘ cache.Provider`. `PersistProvider`
 * publishes the engines as a store-core service (and extends the inherited registry), so a single service
 * scope exposes the engines to plugins whether a store is cached or not. Either layer is skipped when its
 * prop is omitted: `persist` absent → no engines; `cache` absent → no cache Provider.
 */
export type StoreProviderProps = {
	/** Source adapters to mount (e.g. `[reactRouterAdapter, localStorageAdapter()]`). One engine per source. */
	persist?: PersistAdapter[]
	/** A cache instance (from `createStoreCache()`) whose `Provider` keeps cached stores alive across mounts. */
	cache?: StoreCache
	/**
	 * Forwarded to the persist layer's `onError`: an I/O failure from an **async** source — a rejected
	 * `get()` or `set()` on its `SourcePort` — with the `source` id that produced it. Named for the
	 * layer because this provider mounts two; `PersistProvider` takes the same handler as `onError`.
	 * Synchronous sources (URL, Web Storage) never reach it. Unset, an async rejection is swallowed and
	 * the store stays the source of truth.
	 */
	onPersistError?: (error: unknown, context: { source: string }) => void
	children: ReactNode
}

export function StoreProvider({ persist, cache, onPersistError, children }: StoreProviderProps): ReactElement {
	// Innermost: the cache Provider (when supplied) sits below the persist engines so cached, persisted
	// stores resolve the engines service from above when their plugins run.
	const withCache = cache ? <cache.Provider>{children}</cache.Provider> : <>{children}</>

	if (persist && persist.length > 0) {
		// Spread conditionally: under `exactOptionalPropertyTypes` an absent handler must be an absent
		// prop, not an explicit `undefined`.
		return (
			<PersistProvider
				adapters={persist}
				{...(onPersistError ? { onError: onPersistError } : {})}
			>
				{withCache}
			</PersistProvider>
		)
	}
	return withCache
}
