'use client'

import { createContext, useContext, useEffect, type ReactElement, type ReactNode } from 'react'

import { capabilitiesOf } from './capability'
import { createServiceRegistry, type ServiceRegistry } from './service'

import type { PluginCleanup, PluginContext } from './plugin'
import type { StoreId } from './store-id'

/** Shared empty registry — used as the default when no `ServicesProvider` is mounted above a consumer. */
const EMPTY_REGISTRY: ServiceRegistry = createServiceRegistry()

const ServicesContext = createContext<ServiceRegistry>(EMPTY_REGISTRY)

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
 * Run the `setup` of every capability attached to `store` — by a `with*` wrapper in the factory
 * chain, or by a hand-written `attachCapability` — once per instance, in attachment order. Cleanups
 * run in reverse on unmount.
 *
 * The instance itself is the only channel: a capability that is not attached to the store does not
 * run, so there is nothing to reconcile between a config list and the wrappers a store was actually
 * built with.
 *
 * Lives here rather than in each binding package because the sequencing is the contract: `setup`
 * runs in an effect (never during render), in attachment order, cleanups mirrored. Two copies of
 * that would drift, and the order is what `pipe(store, withHistory(), withPersist())` relies on to
 * have history already listening when persist pushes its hydrated value in.
 */
export function useCapabilities(store: object, services: ServiceRegistry, id: StoreId): void {
	useEffect(() => {
		const plugins = capabilitiesOf(store)
		if (plugins.length === 0) return
		const context: PluginContext = { services, id, isServer: IS_SERVER }
		const cleanups: PluginCleanup[] = plugins.map((plugin) => plugin.setup(store, context))
		return () => {
			for (const cleanup of [...cleanups].reverse()) {
				if (cleanup) cleanup()
			}
		}
		// `id` is a per-factory constant, stable by construction.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [store, services])
}
