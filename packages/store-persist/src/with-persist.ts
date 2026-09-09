import { attachCapability } from '@ez-kit/store-core'

import { bindPersist, persist, type PersistPluginOptions } from './plugin'

import type { StorePort } from '@ez-kit/store-core'

/**
 * The runtime half of every binding package's `withPersist`: build the per-source bindings, attach
 * the `$url` / `$persist` control handles, and register the persist capability on the store so the
 * mount seam (`createContextStore`'s Provider, or the instance cache) connects those bindings to the
 * engines. Only construction happens here — each binding still re-reads its pristine defaults when
 * it connects.
 *
 * The typed wrapper stays in the binding package, because only that package knows how to get from a
 * store handle to its state type: for Valtio they are the same object, for Zustand the state is
 * `ExtractState<TStore>`. A single generic signature here could only serve one of them honestly.
 */
export function applyPersist<TStore extends object, TState extends object>(
	store: TStore,
	port: StorePort<TStore>,
	options: PersistPluginOptions<TState>,
): void {
	bindPersist(store, port, options)
	attachCapability(store, persist(port, options))
}
