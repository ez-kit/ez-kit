'use client'

/**
 * Valtio's persist front. Everything here is `@ez-kit/store-persist` with this package's
 * {@link valtioPort} already bound: `withPersist` / `persist` know how to read, write and observe a
 * Valtio proxy, and the substrate half (provider, adapters, codecs, handles) is re-exported
 * unchanged, so an app imports one name from one place.
 *
 * Low-level engine primitives live on `@ez-kit/va-store/persist/internals`, source adapters on
 * `./storage` and `./url` — the same split as before this package's persist core was extracted.
 */

import { applyPersist, persist as corePersist } from '@ez-kit/store-persist'

import { valtioPort } from './port'

import type { StoreEnhancer, StorePlugin } from '@ez-kit/store-core'
import type { PersistHandles, PersistPluginOptions } from '@ez-kit/store-persist'

export { valtioPort } from './port'

/**
 * Factory-position front for the persist plugin: builds the per-source bindings, attaches the
 * `$url` / `$persist` control handles, and registers the plugin so `createContextStore`'s Provider
 * (or the instance cache) connects those bindings to the engines at mount. Only construction moves
 * into the factory phase — each binding still reads its pristine defaults when it connects.
 *
 * Curried like every `with*` wrapper, so `pipe(proxy(…), withHistory(…), withPersist({ fields }))`
 * reads in attachment order and the `fields` builder's selectors are typed against the state the
 * chain has accumulated. The work happens when the enhancer is applied, not when it is built.
 *
 * The handles are on the returned type, on a par with `withHistory`'s `history`, so
 * `store.$url.runWithMeta(…)` type-checks off `useStore()` without the `urlHandle()` accessor (which
 * remains, for a proxy whose type has been widened away). Both slots are always present; a store
 * that declares no field for one of them gets an inert handle there. Unlike `history` they are
 * NON-enumerable, so they are absent from `snapshot()` at runtime even though the widened type
 * reaches it.
 */
export function withPersist<T extends object>(
	options: PersistPluginOptions<NoInfer<T>> = {},
): StoreEnhancer<T, T & PersistHandles> {
	return (target: T) => {
		applyPersist(target, valtioPort, options)
		return target as T & PersistHandles
	}
}

/**
 * The persist capability as a bare plugin, for a proxy that is wired by hand
 * (`attachCapability(proxy, persist({ fields }))`) rather than through {@link withPersist}. Same
 * options, same behaviour; `withPersist` is this plus the handles and the attachment.
 */
export function persist<T extends object = object>(options: PersistPluginOptions<T> = {}): StorePlugin<T> {
	return corePersist<T, T>(valtioPort, options)
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

// --- Decorator + accessor fronts (field declaration) ---
export { persistField, type PersistFieldOptions } from '@ez-kit/store-persist'
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
