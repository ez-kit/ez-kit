import { type ReactElement, type ReactNode } from 'react'

import { PersistProvider, type PersistAdapters, type PersistErrorContext } from '../persist'

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
	persist?: PersistAdapters
	defaultSource?: string
	/** A cache instance (from `createStoreCache()`) whose `Provider` keeps cached stores alive across mounts. */
	cache?: StoreCache
	/**
	 * Forwarded to the persist layer's `onError`: read/write/schema failures include the source,
	 * operation and affected address or scope. Named for the
	 * layer because this provider mounts two; `PersistProvider` takes the same handler as `onError`.
	 * Synchronous throws and async rejections are reported with operation/address context. Automatic
	 * failures are handled even when unset; awaited flush/reset still reject and memory stays usable.
	 */
	onPersistError?: (error: unknown, context: PersistErrorContext) => void
	children: ReactNode
}

export function StoreProvider({
	persist,
	cache,
	defaultSource,
	onPersistError,
	children,
}: StoreProviderProps): ReactElement {
	// Innermost: the cache Provider (when supplied) sits below the persist engines so cached, persisted
	// stores resolve the engines service from above when their plugins run.
	const withCache = cache ? <cache.Provider>{children}</cache.Provider> : <>{children}</>

	if (persist) {
		// Spread conditionally: under `exactOptionalPropertyTypes` an absent handler must be an absent
		// prop, not an explicit `undefined`.
		return (
			<PersistProvider
				adapters={persist}
				{...(defaultSource !== undefined ? { defaultSource } : {})}
				{...(onPersistError ? { onError: onPersistError } : {})}
			>
				{withCache}
			</PersistProvider>
		)
	}
	return withCache
}
