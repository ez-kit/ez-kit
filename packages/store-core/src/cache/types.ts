import type { PluginContext } from '../plugin'

/** Structural coordinate of one live entry, as surfaced by `keys()` / `useCacheKeys()`. */
export type CacheRecord = {
	path: string[]
	name: string
	id: string
}

/** Nested view of live entries: path segments nest as objects; each leaf maps store `name` → `id[]`. */
export type CacheTree = {
	[segment: string]: CacheTree | string[]
}

/** Absolute address of a cache entry within a store group: a tree `path` plus the entry `id`. */
export type CacheAddress = {
	/** Resolved tree location of the entry. Defaults to `[]` (root) when omitted. */
	path?: string[]
	/** Identity of the entry within its store group at `path`. */
	id: string
}

export type StoreCacheOptions = {
	/** Default eviction delay in ms after an entry's observer count reaches zero. */
	gcTime?: number
}

/** Options passed to `getOrCreate` controlling lifetime and the plugin context for the new instance. */
export type CreateOptions = {
	gcTime: number
	context: PluginContext
}

/**
 * `_T` is unused within this type today — capabilities are attached to the instance itself via
 * `attachCapability` inside the factory (see `CachedStoreFactory`), not declared here. It stays on the
 * signature so existing call sites (`createCachedStore<TStore>(factory, options: CachedStoreOptions<TStore>)`)
 * keep compiling unchanged; the alternative is a wider, unrelated signature change across every consumer.
 */
export type CachedStoreOptions<_T> = {
	/** Group namespace; must be unique within a cache. Visible in `keys()` / `useCacheKeys()`. */
	name: string
	/** Store-group default `gcTime`, overriding the cache default. */
	gcTime?: number
}
