import type { PluginCleanup } from '../plugin'
import type { StoreId } from '../store-id'

/**
 * Opaque instance reference the cache holds. The core never calls a method on it — it is a plain
 * object handle (a Zustand store, a Valtio proxy, anything). REPLACES zustand's `StoreApi<unknown>`.
 */
export type AnyInstance = object

/** A live instance paired with its structural id, kept on the reactive membership view. */
export type MountedInstance = { instance: AnyInstance; storeId: StoreId }

/** Per-entry lifecycle metadata: ref-count, gc config, eviction timer, plugin cleanups. */
export type InstanceMeta = {
	instance: AnyInstance
	storeId: StoreId
	observerCount: number
	gcTime: number
	/**
	 * Pending eviction timer, live only while the entry is unobserved. It is the sole authority on
	 * the deadline — there is deliberately no wall-clock idle stamp to cross-check it against, since
	 * the two clocks drift and disagreeing with the timer once strands the entry forever.
	 */
	evictionTimer: ReturnType<typeof setTimeout> | undefined
	/** Retained plugin cleanups; run exactly once when the entry is cleared. */
	cleanups: readonly PluginCleanup[]
	/** Guards against running cleanups twice (e.g. concurrent clear + eviction). */
	cleared: boolean
}

/**
 * Tiny internal reactive view of membership. NOT zustand — a `Set` of listeners plus a `getSnapshot`,
 * so the cache package carries zero store-manager dependency. The React layer wraps it via
 * `useSyncExternalStore`.
 */
export type MembershipView = {
	subscribe: (listener: () => void) => () => void
	getSnapshot: () => ReadonlyMap<string, MountedInstance>
	/** Replace the snapshot and notify listeners. Internal to the cache. */
	set: (next: ReadonlyMap<string, MountedInstance>) => void
}
