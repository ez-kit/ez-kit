import { attachCapability } from '@ez-kit/store-core'

import { type PersistHandles } from './handle'
import { bindPersist, persist, type PersistPluginOptions } from './plugin'

/**
 * Factory-position front for the persist plugin: builds the per-source bindings, attaches the
 * `$url` / `$persist` control handles, and registers the plugin so `createContextStore`'s Provider
 * (or the instance cache) connects those bindings to the engines at mount.
 *
 * The handles are on the returned type, on a par with `withHistory`'s `history`, so
 * `store.$url.runWithMeta(…)` type-checks off `useStore()` without the `urlHandle()` accessor (which
 * remains, for a proxy whose type has been widened away). Both slots are always present; a store
 * that declares no field for one of them gets an inert handle there — see {@link PersistHandles}.
 * Unlike `history` they are NON-enumerable, so they are absent from `snapshot()` at runtime even
 * though the widened type reaches it.
 */
export function withPersist<T extends object>(target: T, options: PersistPluginOptions<T> = {}): T & PersistHandles {
	bindPersist(target, options)
	attachCapability(target, persist<T>(options))
	return target as T & PersistHandles
}
