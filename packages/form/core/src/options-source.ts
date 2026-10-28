import type { FieldRef } from './rules'
import type { LocalizedSelectOption, OptionValue } from './select-option'

/**
 * Anything that survives a round trip through `JSON.stringify` / `JSON.parse` — the only
 * values an `OptionSourceRef`'s `params` may carry, because the whole point of naming a source
 * from the document is that the document is data, not code.
 */
export type JsonValue = string | number | boolean | null | readonly JsonValue[] | { readonly [key: string]: JsonValue }

/**
 * A document's reference to an option source — what `optionsFrom` holds.
 *
 * Where a select-like field's options come from, when they are not written into the document.
 *
 * The document names a **source**, never a URL. `parseFormSchema` is the trust boundary and
 * validates every extension point against *this app's* registered capabilities (`fieldTypes`,
 * `blocks`, `rules`, and now `optionSources`); a URL is unverifiable, is an SSRF-shaped
 * surface, and — as Form.io and SurveyJS both demonstrate — inevitably drags in an auth flag,
 * a templating mini-language and an executable-JS escape hatch behind it.
 *
 * `dependsOn` is keyed by the **provider's parameter name**, not by the path it reads:
 *
 * ```json
 * { "source": "dictionary",
 *   "params": { "domain": "cities" },
 *   "dependsOn": { "country": "address.country" } }
 * ```
 *
 * so one source serves documents whose field layouts differ (`country` vs `address.country`),
 * and the object a source receives is byte-for-byte the one the JSX API produces from
 * `optionsParams={{ country }}`. Keying by the path instead would bind the source to one
 * document's layout. There is no `dependsOn` in the JSX API at all — there you pass the live
 * value directly; `dependsOn` exists only because JSON cannot hold one.
 */
export type OptionSourceRef = {
	/** A key the app registered as an option source. Unregistered names are a parse error. */
	source: string
	/**
	 * Provider parameter name → where its value lives in the form. Absolute paths from the
	 * root of the form values, the same vocabulary `Rule`'s `field` uses; the `./` prefix stays
	 * reserved for array items.
	 */
	dependsOn?: Record<string, FieldRef>
	/** Static arguments from the document. Must survive `JSON.stringify`. */
	params?: Record<string, JsonValue>
}

/** The one argument an option source receives: the flat, already-merged parameter object. */
export type OptionSourceInput = {
	/**
	 * The source's parameters, merged from the document's static `params` and its `dependsOn`
	 * lookups — or, on the JSX path, straight from `optionsParams`. Both authoring paths
	 * produce the identical object, which is the whole reason `dependsOn` is keyed by the
	 * parameter name rather than by the path it reads.
	 */
	params: Record<string, unknown>
	/**
	 * The text currently typed into a `searchable` select or multiselect, or `undefined` for a
	 * field that is not searchable.
	 *
	 * Additive: a source written before this key existed simply ignores it, which is why
	 * `OptionSource` (from `@ez-kit/form-react`) could grow the searchable form without breaking anyone.
	 *
	 * It arrives **debounced** and only once it is long enough. The renderer hands the source the
	 * typed text after `debounce` ms without typing, and only when it is at least `minLength`
	 * characters long; both are set on the source (`debounce`, `minLength` on a
	 * `SearchableOptionSource`) or per field (`searchable: { debounce, minLength }`, in TSX or in a
	 * schema node), the field winning. A source defaults to 300 ms and no minimum.
	 *
	 * Below the minimum the hook receives `query: undefined` — "no search" — and should not fetch
	 * a result page for it; the kit shows a hint instead of an empty list, and the selected
	 * options still come from `useSelectedOptions`.
	 */
	query?: string
}

/**
 * What a source reports, synchronously, on every render.
 *
 * `loading` flows straight into the kit contract's `loading` key (the one an app otherwise
 * passes by hand as `loading={query.isPending}`), so an empty list while a request is in
 * flight draws as a skeleton rather than as "there is nothing to choose from".
 *
 * `options` are `LocalizedSelectOption`s: a source may return translation keys, and the
 * renderer resolves them through the same `resolveSelectOptions` a statically-authored list
 * goes through.
 */
export type OptionSourceResult = {
	options: readonly LocalizedSelectOption<OptionValue>[]
	loading: boolean
}
