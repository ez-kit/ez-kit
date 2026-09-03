import { createStore, type CreateStoreResult, type StoreFactory, type StoreInit } from '../create-store'

import type { ControlledConfig, StorePlugin } from '@ez-kit/store-core'

/** Seed envelope passed to a `createContextStore` factory. */
export type ContextStoreInit<TDefaultValue> = StoreInit<TDefaultValue>

export type CreateContextStoreFactory<TState extends object, TDefaultValue> = StoreFactory<TState, TDefaultValue>

export type CreateContextStoreResult<TState extends object, TDefaultValue> = CreateStoreResult<TState, TDefaultValue>

export type { ItemRenderArg, UseSnapshotOptions } from '../create-store'

export type CreateContextStoreOptions<TState extends object> = {
	plugins?: readonly StorePlugin<TState>[]
	/** Per-key overrides for fields controlled via the Provider's `value` prop. */
	controlled?: ControlledConfig<TState>
}

/**
 * Context store built on the plugin-aware {@link createStore}. With no plugins this is the original
 * behavior unchanged: returns `{ Provider, useSnapshot, useStore, Item, StoreItem }` and creates the
 * proxy once per Provider via `useRef`. Read with `useSnapshot()` (auto-tracked snapshot), write
 * through the raw proxy from `useStore()`. Pass `plugins` to bind capabilities to the Provider's
 * mount lifetime, and `controlled` for per-key overrides of the Provider's `value` prop.
 */
export function createContextStore<TState extends object, TDefaultValue = undefined>(
	factory: CreateContextStoreFactory<TState, TDefaultValue>,
	options?: CreateContextStoreOptions<TState>,
): CreateContextStoreResult<TState, TDefaultValue> {
	return createStore(factory, {
		name: 'createContextStore',
		plugins: options?.plugins ?? [],
		...(options?.controlled ? { controlled: options.controlled } : {}),
	})
}
