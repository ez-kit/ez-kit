/**
 * Source-agnostic persist core. Binds a Valtio proxy to any external substrate through a
 * {@link SourcePort}; URL and storage are adapters layered on top (see `./url`, `./storage`).
 */
export { applyKeyed, ApplyMode, createBinding, desiredKeyed, type MetaRunner, type PersistBinding } from './binding'
export { createPersistEngine, type CreateEngineOptions, type PersistEngine } from './engine'
export { fieldKey } from './key-naming'
export { findPropertyDescriptor, parentOf, readPath, writePath } from './path'
export { type BindingRegistry, createRegistry } from './registry'
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
export { validateBinding } from './validate'
