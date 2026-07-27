import { createStore, type CreateStoreResult, type StoreFactory, type StoreInit } from '../create-store'

import type { StorePlugin } from '@ez-kit/store-core'

/** Seed envelope passed to a `createContextStore` factory. Reserves room for a future controlled `value`. */
export type ContextStoreInit<TDefaultValue> = StoreInit<TDefaultValue>

export type CreateContextStoreFactory<TState extends object, TDefaultValue> = StoreFactory<TState, TDefaultValue>

export type CreateContextStoreResult<TState extends object, TDefaultValue> = CreateStoreResult<TState, TDefaultValue>

export type { ItemRenderArg, UseSnapshotOptions } from '../create-store'

/**
 * Context store built on the plugin-aware {@link createStore}. With no plugins this is the original
 * behavior unchanged: returns `{ Provider, useSnapshot, useContextStore, Item }` and creates the proxy
 * once per Provider via `useRef`. Read with `useSnapshot()` (auto-tracked snapshot), write through the
 * raw proxy from `useContextStore()`. Pass `plugins` to bind capabilities to the Provider's mount
 * lifetime.
 */
export function createContextStore<TState extends object, TDefaultValue = undefined>(
	factory: CreateContextStoreFactory<TState, TDefaultValue>,
	options?: { plugins?: readonly StorePlugin<TState>[] },
): CreateContextStoreResult<TState, TDefaultValue> {
	return createStore(factory, { name: 'createContextStore', plugins: options?.plugins ?? [] })
}
