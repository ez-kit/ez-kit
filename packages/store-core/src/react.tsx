'use client'

import { createContext, useContext, useEffect, type ReactElement, type ReactNode } from 'react'

import { capabilitiesOf } from './capability'
import { createServiceRegistry, type ServiceRegistry } from './service'

import type { PluginCleanup, PluginContext, StorePlugin } from './plugin'
import type { StoreId } from './store-id'

/** Shared empty registry — used as the default when no `ServicesProvider` is mounted above a consumer. */
const EMPTY_REGISTRY: ServiceRegistry = createServiceRegistry()

const ServicesContext = createContext<ServiceRegistry>(EMPTY_REGISTRY)

/** Shared empty plugin list, so the default `extra` argument keeps a stable identity. */
const EMPTY_PLUGINS: readonly StorePlugin<never>[] = []

export type ServicesProviderProps = {
	registry: ServiceRegistry
	children: ReactNode
}

/** Publishes a {@link ServiceRegistry} to descendants so plugins can resolve app-level services. */
export function ServicesProvider({ registry, children }: ServicesProviderProps): ReactElement {
	return <ServicesContext.Provider value={registry}>{children}</ServicesContext.Provider>
}

/**
 * Read the ambient {@link ServiceRegistry}. Returns an empty registry when no provider is mounted, so a
 * cache used without services still works (plugins that need a service will get a "not mounted" error).
 */
export function useServices(): ServiceRegistry {
	return useContext(ServicesContext)
}

/**
 * `typeof window === 'undefined'` once per module: whether this render is happening on the server,
 * which every capability's `setup` needs in order to skip client-only wiring (subscriptions, storage).
 */
const IS_SERVER = typeof window === 'undefined'

/**
 * Run the `setup` of every capability attached to `store` (via `attachCapability`, i.e. by a `with*`
 * wrapper in the factory chain) plus any `extra` plugins the store's own options declared, once per
 * instance, in attachment order — extras last, so a hand-passed plugin sees a fully wrapped store.
 * Cleanups run in reverse on unmount.
 *
 * Lives here rather than in each binding package because the sequencing is the contract: `setup`
 * runs in an effect (never during render), capabilities before extras, cleanups mirrored. Two
 * copies of that would drift, and the order is what `pipe(store, withHistory(), withPersist())`
 * relies on to have history already listening when persist pushes its hydrated value in.
 */
export function useCapabilities<T extends object>(
	store: T,
	services: ServiceRegistry,
	id: StoreId,
	extra: readonly StorePlugin<T>[] = EMPTY_PLUGINS,
): void {
	useEffect(() => {
		const plugins = [...capabilitiesOf(store), ...extra]
		if (plugins.length === 0) return
		const context: PluginContext = { services, id, isServer: IS_SERVER }
		const cleanups: PluginCleanup[] = plugins.map((plugin) => plugin.setup(store, context))
		return () => {
			for (const cleanup of [...cleanups].reverse()) {
				if (cleanup) cleanup()
			}
		}
		// `id` is a per-factory constant and `extra` a per-factory array; both are stable by construction.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [store, services])
}
