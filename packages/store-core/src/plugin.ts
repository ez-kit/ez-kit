import type { ServiceRegistry } from './service'
import type { StoreId } from './store-id'

/**
 * Cleanup returned by a plugin's `setup`; runs once when the cache releases the instance. A plugin that
 * needs no teardown returns nothing (`undefined`). (`undefined` rather than `| void` to satisfy the
 * project's `no-invalid-void-type` lint rule; the contract is identical.)
 */
export type PluginCleanup = (() => void) | undefined

/** Context handed to a plugin's `setup`: app-level services, the instance identity, and an SSR guard. */
export type PluginContext = {
	services: ServiceRegistry
	id: StoreId
	isServer: boolean
}

/**
 * A capability bound to an instance's lifetime. `setup` runs once on instance creation; its returned
 * cleanup runs when the instance is released. A plugin reaches app-level services only via `ctx.services`.
 */
export type StorePlugin<T = unknown> = {
	name: string
	setup(instance: T, ctx: PluginContext): PluginCleanup
}
