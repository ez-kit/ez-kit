/** How a searchable field feeds its typed text to an option source. */
export type SearchSettings = {
	/** Milliseconds of no typing before the source sees the text. */
	debounce?: number
	/** Shortest text the source sees; below it the source gets `query: undefined`. */
	minLength?: number
}

/**
 * A `searchable` flag in its scalar-or-object form: `true` takes the defaults, an object tunes
 * them, and the object form is itself "on" — `{}` is `true` spelled out.
 */
export type Searchable = boolean | SearchSettings

/** A field over an option source: one request per pause in typing, from the first character. */
export const REMOTE_SEARCH_DEFAULTS: Readonly<Required<SearchSettings>> = Object.freeze({
	debounce: 300,
	minLength: 0,
})

/** An in-memory `options` list: filtering costs nothing, so it follows every keystroke. */
export const LOCAL_SEARCH_DEFAULTS: Readonly<Required<SearchSettings>> = Object.freeze({
	debounce: 0,
	minLength: 0,
})

/**
 * Whether a `searchable` value turns the search box on — `true` or any settings object. It reads
 * a value already typed as `Searchable`; it does not validate one (`parseFormSchema` does).
 */
export function isSearchable(value: Searchable | undefined): value is true | SearchSettings {
	return value === true || typeof value === 'object'
}
