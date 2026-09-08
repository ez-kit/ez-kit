'use client'

/**
 * Zustand's persist front. Everything here is `@ez-kit/store-persist` with this package's
 * {@link zustandPort} already bound: `withPersist` / `persist` know how to read, write and observe a
 * Zustand store, and the substrate half (provider, adapters, codecs, handles) is re-exported
 * unchanged, so an app imports one name from one place.
 *
 * The one shape that differs from `@ez-kit/va-store` is where the state type comes from: a Zustand
 * store is a handle, so the `fields` selectors are typed against `ExtractState<TStore>` while the
 * handles (`$url` / `$persist`) are attached to — and read off — the handle itself.
 */

import { applyPersist, persist as corePersist } from '@ez-kit/store-persist'

import { zustandPort } from './port'

import type { StoreEnhancer, StorePlugin } from '@ez-kit/store-core'
import type { PersistHandles, PersistPluginOptions } from '@ez-kit/store-persist'
import type { ExtractState, StoreApi } from 'zustand/vanilla'

export { zustandPort } from './port'

/**
 * Factory-position front for the persist plugin: builds the per-source bindings, attaches the
 * `$url` / `$persist` control handles to the store handle, and registers the plugin so
 * `createContextStore`'s Provider (or the instance cache) connects those bindings to the engines at
 * mount. Only construction happens in the factory phase — each binding still reads its pristine
 * defaults when it connects.
 *
 * Applied through `pipe`, so it composes with the store the way `withHistory` composes with the
 * initializer: `pipe(createStore<Filters>()(init), withPersist({ fields }))`. The `fields` builder's
 * selectors are typed against the store's state, not its handle.
 */
export function withPersist<TStore extends StoreApi<object>>(
	options: PersistPluginOptions<NoInfer<ExtractState<TStore>>> = {},
): StoreEnhancer<TStore, TStore & PersistHandles> {
	return (target: TStore) => {
		applyPersist(target, zustandPort, options)
		return target as TStore & PersistHandles
	}
}

/**
 * The persist capability as a bare plugin, for `createContextStore(factory, { plugins: [persist(…)] })`
 * or a hand-written `attachCapability(store, persist(…))`. Same options, same behaviour;
 * {@link withPersist} is this plus the handles and the attachment.
 */
export function persist<TStore extends StoreApi<object>>(
	options: PersistPluginOptions<ExtractState<TStore>> = {},
): StorePlugin<TStore> {
	return corePersist<TStore, ExtractState<TStore>>(zustandPort, options)
}

// --- Substrate half: re-exported from the shared core, unchanged ---
export { PERSIST_ENGINES, type PersistEngines, useHydrated } from '@ez-kit/store-persist'
export type { PersistPluginOptions } from '@ez-kit/store-persist'
export {
	type AmbientAdapter,
	type EngineMap,
	type PersistAdapter,
	type PersistMount,
	PersistProvider,
	type PersistProviderProps,
	type RenderScopedAdapter,
	usePersistEngines,
} from '@ez-kit/store-persist'

// --- Per-source control handles: typed accessors ($url / $persist) ---
export {
	persistHandle,
	type PersistHandle,
	type PersistHandles,
	type UrlHandle,
	urlHandle,
} from '@ez-kit/store-persist'

// --- Accessor front (field declaration) ---
export type { AccessorFieldOptions, FieldBuilder, FieldSpec, FieldsBuilder } from '@ez-kit/store-persist'

// --- Codecs ---
export type { AnyCodec, Codec } from '@ez-kit/store-persist'
export {
	paramArray,
	type ParamArrayOptions,
	paramBigInt,
	paramBoolean,
	paramDate,
	paramEnum,
	paramJson,
	paramNumber,
	paramString,
} from '@ez-kit/store-persist'

// --- Core types ---
export type {
	AnyParser,
	CommitCtx,
	FieldDescriptor,
	Keyed,
	KeyedDiff,
	MetaMerge,
	Parser,
	PersistOptions,
	SourcePort,
	SyncSourcePort,
} from '@ez-kit/store-persist'
