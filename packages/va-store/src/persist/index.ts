'use client'

/**
 * Source-agnostic persist core. Binds a Valtio proxy to any external substrate through a
 * {@link SourcePort}; URL and storage are adapters layered on top (see `./url`, `./storage`).
 *
 * This entrypoint is substrate-neutral: it never imports `react-router`, `next`, `URLSearchParams`,
 * or a storage API. Source adapters live behind their own peer-gated subpaths.
 *
 * This entry deliberately exposes only the app- and adapter-author-facing surface. Low-level engine
 * primitives (bindings, the engine factory, path/key helpers, spec resolution) live on the separate
 * `@ez-kit/va-store/persist/internals` subpath — import from there only when building a custom adapter.
 */

// --- persist plugin + app-level engines service ---
export { persist, type PersistPluginOptions, useHydrated } from './plugin'
export { PERSIST_ENGINES, type PersistEngines } from './service'

// --- Provider + adapter contract ---
export {
	type AmbientAdapter,
	type EngineMap,
	type PersistAdapter,
	type PersistMount,
	PersistProvider,
	type PersistProviderProps,
	type RenderScopedAdapter,
	usePersistEngines,
} from './provider'

// --- Per-source control handles: typed accessors ($url / $persist) ---
export { persistHandle, type PersistHandle, type UrlHandle, urlHandle } from './handle'

// --- Decorator + accessor fronts (field declaration) ---
export { persistField, type PersistFieldOptions } from './decorators'
export { type AccessorFieldOptions, type FieldBuilder, type FieldSpec, type FieldsBuilder } from './accessor'

// --- Codecs ---
export { type AnyCodec, type Codec } from './codecs/codec'
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
} from './codecs'

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
} from './types'
