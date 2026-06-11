/**
 * Per-field parser: converts one typed store value to/from a URL string.
 *
 * Contract (round-trip stability): for any value `v`, `parse(stringify(v))`
 * must deep-equal `v`, and `stringify(parse(s))` must be stable. This is what
 * lets the sync engine break the feedback loop by comparing serialized forms.
 */
export type Param<T> = {
	/** Encode a value to its URL string form. Return `null` to omit the parameter. */
	stringify(value: T): string | null
	/** Decode a raw URL string back to a value. May throw; callers fall back to the default. */
	parse(raw: string): T
	/** Optional equality used to break the loop. Defaults to `Object.is`. */
	equals?(a: T, b: T): boolean
}

/** Type-erased parser used inside the engine/layouts. */
export type AnyParam = Param<unknown>

/**
 * A resolved persisted field: the path into the proxy, the parser for its leaf value,
 * and how its key is placed in the URL. Produced by both the decorator and accessor fronts.
 */
export type FieldDescriptor = {
	/** Ordered property segments from the store root to the leaf (e.g. `['filters','price','min']`). */
	path: string[]
	/** Parser for the leaf value. */
	parser: AnyParam
	/** Override for the leaf segment of the URL key (relative) — defaults to the last path segment. */
	key?: string
	/** Pin to an exact top-level URL key, ignoring ancestor path segments (flat layout only). */
	absolute?: boolean
}

/** Map of fields (by descriptor identity) to a value. Used between engine and layouts. */
export type FieldValues = Map<FieldDescriptor, unknown>

/**
 * Strategy that maps the set of persisted fields onto URL param keys.
 * `flat()` / `json(key)` / `qs()` each return one of these.
 */
export type SearchParamsLayout = {
	/** URL keys this layout owns, given the field descriptors. Used for merge/cleanup. */
	ownedKeys(fields: FieldDescriptor[]): string[]
	/** Read owned params into a map of the fields actually present in the URL. */
	read(params: URLSearchParams, fields: FieldDescriptor[]): FieldValues
	/**
	 * Write `values` (only the fields that should appear in the URL) into a clone of `params`,
	 * deleting any owned key whose field is absent from `values`, preserving foreign keys.
	 */
	write(params: URLSearchParams, values: FieldValues, fields: FieldDescriptor[]): URLSearchParams
	/** When true, `absolute` field placement is not honoured (json/qs); the engine warns. */
	ignoresAbsolute?: boolean
}

/** How a URL update affects browser history. */
export type SearchParamsHistory = 'push' | 'replace'

/** Global sync options — the second argument to `withSearchParams` / `withSearchParamsFields`. */
export type SearchParamsOptions = {
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
