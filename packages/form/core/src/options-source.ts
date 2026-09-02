import type { FieldRef } from './rules'

/**
 * Anything that survives a round trip through `JSON.stringify` / `JSON.parse` — the only
 * values an `OptionsSource`'s `params` may carry, because the whole point of naming a source
 * from the document is that the document is data, not code.
 */
export type JsonValue = string | number | boolean | null | readonly JsonValue[] | { readonly [key: string]: JsonValue }

/**
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
export type OptionsSource = {
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
