/**
 * Per-field coder/decoder: converts one typed store value to/from a URL string.
 *
 * Contract (round-trip stability): for any value `v`, `deserialize(serialize(v))`
 * must deep-equal `v`, and `serialize(deserialize(s))` must be stable. This is what
 * lets the sync engine break the feedback loop by comparing serialized forms.
 */
export type ParamCodec<T> = {
	/** Encode a value to its URL string form. Return `null` to omit the parameter. */
	serialize(value: T): string | null
	/** Decode a raw URL string back to a value. May throw; callers fall back to the default. */
	deserialize(raw: string): T
	/** Optional equality used to break the loop. Defaults to `Object.is`. */
	equals?(a: T, b: T): boolean
}

/** Map of persisted fields to their codecs. Partial — only listed fields are synced. */
export type SearchParamsFields<T> = {
	[K in keyof T]?: ParamCodec<T[K]>
}

/** Type-erased codec used inside the engine/layouts. */
export type AnyParamCodec = ParamCodec<unknown>

/** Type-erased fields map the engine passes to layouts. */
export type FieldsRecord = Record<string, AnyParamCodec | undefined>

/** A typed snapshot of just the persisted fields (the subset the engine owns). */
export type PersistedValues = Record<string, unknown>

/**
 * Strategy that maps the set of persisted fields onto URL param keys.
 * `flat()` / `json(key)` / `qs()` each return one of these.
 */
export type SearchParamsLayout = {
	/** URL keys this layout owns, given the persisted field names. Used for merge/cleanup. */
	ownedKeys(fieldNames: string[]): string[]
	/** Read owned params into a partial values object (only fields actually present in the URL). */
	read(params: URLSearchParams, fields: FieldsRecord): PersistedValues
	/**
	 * Write `values` (only the fields that should appear in the URL) into a clone of `params`,
	 * deleting any owned key whose field is absent from `values`, preserving foreign keys.
	 */
	write(params: URLSearchParams, values: PersistedValues, fields: FieldsRecord): URLSearchParams
}

/** How a URL update affects browser history. */
export type SearchParamsHistory = 'push' | 'replace'

/** Second argument to `proxyWithSearchParams` / `createSearchParamsStore`. */
export type SearchParamsOptions<T> = {
	/** Which fields are persisted, and with which codecs. */
	fields: SearchParamsFields<T>
	/** Layout strategy. Defaults to `flat()`. */
	layout?: SearchParamsLayout
	/** Default history behaviour for writes. Defaults to `'replace'`. */
	history?: SearchParamsHistory
	/** Throttle window (ms) for URL writes. Proxy reads stay instant. Defaults to `0`. */
	throttleMs?: number
	/** Omit a param when its value equals the field default. Defaults to `true`. */
	clearOnDefault?: boolean
}

/** Imperative control handle attached to a synced proxy as `$searchParams`. */
export type SearchParamsControl = {
	/** Run mutations whose resulting URL write pushes a new history entry. */
	push(mutate: () => void): void
	/** Run mutations whose resulting URL write replaces the current history entry. */
	replace(mutate: () => void): void
}

/** A Valtio proxy augmented with the search-params control handle. */
export type SearchParamsProxy<T extends object> = T & {
	readonly $searchParams: SearchParamsControl
}

/** The writer the engine calls to commit a fully-merged set of params. */
export type SearchParamsUpdater = (next: URLSearchParams, options: { history: SearchParamsHistory }) => void

/**
 * The capability the engine needs from a router, exposed as React hooks (both the reactive
 * read and the writer are render-scoped — react-router's setter only exists in render). The
 * adapter is dumb: it writes a fully-merged `URLSearchParams`; all merging happens in the engine.
 */
export type RouterAdapter = {
	/** Reactive read — called in render; re-renders the coordinator on navigation. */
	useSearchParams(): URLSearchParams
	/** Returns the writer, captured in render scope. `history` selects push vs replace. */
	useUpdater(): SearchParamsUpdater
	/** Optional non-reactive read for the async (throttled) flush, avoiding stale closures. */
	getSnapshot?(): URLSearchParams
}
