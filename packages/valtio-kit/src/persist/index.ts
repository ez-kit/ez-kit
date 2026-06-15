/**
 * Source-agnostic persist core. Binds a Valtio proxy to any external substrate through a
 * {@link SourcePort}; URL and storage are adapters layered on top (see `./url`, `./storage`).
 *
 * This entrypoint is substrate-neutral: it never imports `react-router`, `next`, `URLSearchParams`,
 * or a storage API. Source adapters live behind their own peer-gated subpaths.
 */

// --- Store factories (SSR-correct, request-scoped) ---
export {
	createPersistFields,
	createPersistStore,
	type CreatePersistStoreResult,
} from './create-persist-store'

// --- Provider + adapter contract ---
export {
	type EngineMap,
	PersistProvider,
	type PersistProviderProps,
	type RenderScopedAdapter,
	usePersistEngines,
} from './provider'

// --- Decorator + accessor fronts ---
export { discoverPersistFields, persistField, type PersistFieldOptions } from './decorators'
export {
	type AccessorFieldOptions,
	type FieldBuilder,
	type FieldSpec,
	type FieldsBuilder,
	resolveFieldSpecs,
} from './accessor'
export { groupBySource, type PersistSpec } from './spec'

// --- Codecs ---
export { resolveParser } from './codecs/auto'
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

// --- Engine primitives (for custom adapter authors) ---
export { applyKeyed, ApplyMode, createBinding, desiredKeyed, type MetaRunner, type PersistBinding } from './binding'
export { createPersistEngine, type CreateEngineOptions, type PersistEngine } from './engine'
export { fieldKey } from './key-naming'
export { findPropertyDescriptor, parentOf, readPath, writePath } from './path'
export { type BindingRegistry, createRegistry } from './registry'
export { validateBinding } from './validate'

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
