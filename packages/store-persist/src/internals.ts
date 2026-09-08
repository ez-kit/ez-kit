/**
 * Engine internals — the low-level primitives that power the persist core. Import these ONLY when
 * authoring a custom source adapter or extending the engine; everyday usage (declaring fields, mounting
 * a provider, reading handles) needs nothing from here. Kept off the main `@ez-kit/store-persist`
 * entry so its autocomplete shows the ~handful of names an app actually reaches for.
 */

// --- Binding + engine ---
export {
	applyKeyed,
	ApplyMode,
	captureDefaults,
	createBinding,
	desiredKeyed,
	type MetaRunner,
	type PersistBinding,
} from './binding'
export { createPersistEngine, type CreateEngineOptions, type PersistEngine } from './engine'

// --- Key naming ---
// (path access — readPath/writePath/setPath — is `@ez-kit/store-core`'s public API, not re-exported here.)
export { fieldKey } from './key-naming'

// --- Spec resolution (decorator discovery + accessor builder → grouped specs) ---
export { discoverPersistFields } from './decorators'
export { resolveFieldSpecs } from './accessor'
export { groupBySource, type PersistSpec } from './spec'

// --- Parser auto-resolution + binding validation ---
export { resolveParser } from './codecs/auto'
export { validateBinding } from './validate'

// --- Raw handle attachment (the typed `urlHandle`/`persistHandle` accessors live on the main entry) ---
export { attachHandles, PERSIST_HANDLE, type SourceBinding, URL_HANDLE } from './handle'

// --- The runtime behind a binding package's `withPersist` ---
export { applyPersist } from './with-persist'
