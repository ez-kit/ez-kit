'use client'

import { createContext, useContext, type ReactElement, type ReactNode } from 'react'

import { createServiceRegistry, type ServiceRegistry } from './service'

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
