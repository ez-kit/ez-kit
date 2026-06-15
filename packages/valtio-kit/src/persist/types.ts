/**
 * Core type contract for the source-agnostic persist engine.
 *
 * The engine binds a Valtio proxy to an external substrate (URL, storage, …) under model B:
 * the proxy is the synchronous source of truth and the substrate is a rehydratable mirror.
 * The engine speaks exactly one interchange language — {@link Keyed} — and never references
 * `URLSearchParams`, any storage API, or React. Everything substrate-specific lives in an adapter
 * behind the {@link SourcePort}.
 */

/**
 * The interchange between the engine and an adapter: a map of logical key → already-stringified
 * value. Parsers run inside the engine, so an adapter only ever sees strings it can pack however
 * its substrate requires (URL params, a JSON blob, IndexedDB records, …).
 */
export type Keyed = Map<string, string>

/**
 * Per-field parser: converts one typed store value to/from its string form.
 *
 * Contract (round-trip stability): for any value `v`, `parse(stringify(v))` must deep-equal `v`,
 * and `stringify(parse(s))` must be stable. This is what lets the engine break the feedback loop
 * by comparing serialized forms. A missing `stringify` defaults to `String(value)`; a `stringify`
 * result of `null` omits the key from the {@link Keyed} output.
 */
export type Parser<T> = {
	/** Decode a raw string back to a value. May throw; callers fall back to the field default. */
	parse(raw: string): T
	/** Encode a value to its string form. Return `null` to omit the key. Defaults to `String(value)`. */
	stringify?(value: T): string | null
	/** Optional equality used to break the loop. Defaults to `Object.is`. */
	equals?(a: T, b: T): boolean
}

/** Type-erased parser used inside the engine. */
export type AnyParser = Parser<unknown>

/**
 * A resolved persisted field: where it lives in the proxy, how its leaf value is parsed, how its
 * substrate key is derived (key naming — `key`/`absolute`/`prefix` — is source-agnostic and lives
 * here), and an opaque `meta` bag the engine forwards to the adapter untouched (e.g. `{ history }`
 * for URL, `{ storageKey }` for storage).
 */
export type FieldDescriptor = {
	/** Ordered property segments from the store root to the leaf (e.g. `['filters','price','min']`). */
	path: string[]
	/** Parser for the leaf value. */
	parser: AnyParser
	/** Override the leaf segment of the substrate key (relative) — defaults to the last path segment. */
	key?: string
	/** Pin to an exact top-level key, ignoring ancestor path segments (granular packing only). */
	absolute?: boolean
	/** Prefix prepended to the substrate key (e.g. a per-store namespace). */
	prefix?: string
	/** Opaque per-field metadata, forwarded to the adapter unread by the engine. */
	meta?: unknown
}

/**
 * What changed in a single commit, as logical keys. Adapters use it for granular writes
 * (touch/delete only these keys) and for async substrates where a full rewrite is wasteful.
 */
export type KeyedDiff = {
	/** Keys whose value was added or changed. */
	set: string[]
	/** Keys removed since the last commit (returned to default, or `stringify` produced `null`). */
	removed: string[]
}

/**
 * Context handed to {@link SourcePort.set} alongside the desired {@link Keyed}. Gives the adapter
 * access to per-field metadata (e.g. `prefix`), the {@link KeyedDiff}, and the per-commit `meta`
 * the engine accumulated for this flush (e.g. `{ history }` for URL push/replace).
 */
export type CommitCtx = {
	/** The descriptors owned by this binding — adapters read `key`/`absolute`/`meta` from them. */
	fields: FieldDescriptor[]
	/** Keys added/changed/removed relative to the last commit. */
	diff: KeyedDiff
	/** Per-commit metadata accumulated for this flush. Opaque to the engine. */
	meta: unknown
}

/**
 * The capability the engine needs from a substrate, deliberately shaped like
 * `useSyncExternalStore` (`get` + `subscribe`) plus a setter. Both synchronous (URL, localStorage)
 * and asynchronous (IndexedDB) substrates are supported via the optional `Promise` return types.
 */
export type SourcePort = {
	/** Read the substrate as a {@link Keyed}. Synchronous for URL/storage, async for IndexedDB. */
	get(): Keyed | Promise<Keyed>
	/** Commit the desired {@link Keyed} to the substrate, given the {@link CommitCtx}. */
	set(desired: Keyed, ctx: CommitCtx): void | Promise<void>
	/**
	 * Subscribe to external changes (e.g. cross-tab `storage` events). Ambient sources only.
	 * The provider — not the engine — wires this to `pull`, so eventing stays per-source.
	 */
	subscribe?(onChange: () => void): () => void
}

/**
 * A synchronous {@link SourcePort} (URL, localStorage/sessionStorage) whose `get`/`set` return
 * immediately. Assignable to {@link SourcePort}; lets callers consume `get()` as a plain `Keyed`.
 */
export type SyncSourcePort = {
	get(): Keyed
	set(desired: Keyed, ctx: CommitCtx): void
	subscribe?(onChange: () => void): () => void
}

/**
 * Strategy for combining the `meta` of mutations that coalesce into one flush. Defaults to
 * last-wins (`{ ...prev, ...next }`). The URL adapter overrides this so a `push` request anywhere
 * in the batch wins over `replace`. The first call in a batch receives `null` as `prev`.
 */
export type MetaMerge = (prev: unknown, next: unknown) => unknown

/** Global persist options shared by every source. */
export type PersistOptions = {
	/** Throttle window (ms) for commits. Proxy reads stay instant. Defaults to `0`. */
	throttleMs?: number
	/** Omit a key when its value equals the field default. Defaults to `true`. */
	clearOnDefault?: boolean
}
