import type { LocalizedSelectOption, OptionValue } from '@ez-kit/form-core'

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
	 * {@link OptionSource} could grow the searchable form without breaking anyone.
	 *
	 * It arrives **raw** — every keystroke, from the first character. Debouncing and a
	 * minimum-length gate are the source's job for now, and belong inside it next to the
	 * cache it already owns:
	 *
	 * ```tsx
	 * function useCitiesSource({ params, query }) {
	 *   const search = useDebouncedValue(query ?? '', 300)
	 *   const result = useQuery({
	 *     queryKey: ['cities', params, search],
	 *     queryFn: () => fetchCities(params, search),
	 *     enabled: search.length >= 2,
	 *   })
	 *   …
	 * }
	 * ```
	 *
	 * This package intends to take debouncing over later; until it does there is deliberately
	 * no delay option, no timer and no default anywhere in it.
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

/**
 * A named source of option lists — **a React hook, not a promise-returning function.**
 *
 * That is the central decision behind this feature. Caching, request deduplication,
 * cancellation and the "a late response for the previous country must not overwrite the
 * current one" race are exactly what TanStack Query, SWR and RTK Query already do; a
 * promise signature would force a worse copy of all four into this package, sitting next to
 * the one the app already has. So this package writes **no fetching, no cache and no abort
 * logic at all** — a source is your query hook, wearing this shape:
 *
 * ```tsx
 * function useCitiesSource({ params }) {
 *   const query = useQuery({ queryKey: ['cities', params], queryFn: () => fetchCities(params) })
 *   return { options: query.data ?? [], loading: query.isPending }
 * }
 *
 * const optionSources = { cities: useCitiesSource }
 * ```
 *
 * A purely synchronous source is equally valid: `() => ({ options: LOCAL, loading: false })`.
 *
 * Three rules follow from it being a hook, and they are not optional:
 *
 * 1. **The registry must be stable across renders.** Hoist it to a module constant or
 *    memoise it — a fresh object every render swaps the hook identity under React.
 * 2. **A source must call a fixed set of hooks.** `api[`useGet${params.domain}Query`](…)`
 *    is illegal: the hook it resolves to changes with the parameters, which breaks the rules
 *    of hooks. Branch on the parameters *inside* one hook call instead (a query key is the
 *    natural place).
 * 2b. **Give it a `use…` name and register the named function**, rather than writing it inline
 *    in the registry literal. React and `eslint-plugin-react-hooks` both identify a hook by its
 *    name; the registry key stays whatever the document calls the source.
 * 3. **A source must not throw.** It reports failure by returning an empty `options` with
 *    `loading: false` and handling the error itself (a toast, a retry, an error boundary of
 *    its own) — a throw here unmounts the whole form.
 */
export type SimpleOptionSource = (input: OptionSourceInput) => OptionSourceResult

/**
 * A source that can also resolve **specific values** to their options — the second form,
 * required by a `searchable` select and optional everywhere else.
 *
 * Everything before this feature assumed a source returns the whole list, so the option for
 * the value already in form state was always on it and a kit could draw its label by looking
 * it up. Server-side search breaks that assumption permanently: the source returns only the
 * page matching the last query. Form state holds `city: 4821`, the current results are Lisbon
 * and Porto, no option carries 4821 — and the trigger renders blank forever. It is the
 * transient "the value arrived before its option" case made permanent.
 *
 * So a searchable source answers two questions instead of one, and react-admin pays exactly
 * the same price (`getMany(ids)` alongside `getList`). `useSelectedOptions` receives the
 * values that need labelling and returns their options; the renderer merges them into the
 * list it hands the kit, deduped by value. **Kit authors never learn two queries exist** —
 * from their side it is still "find the option whose value matches".
 *
 * Both members are hooks and must be **named `use…` functions**, for the same reason a plain
 * source must be: React and `eslint-plugin-react-hooks` identify a hook by its name. Writing
 * them as named declarations and referencing them in the object literal satisfies that;
 * `source.useOptions(input)` as a member call is fine for the lint rule.
 *
 * ```tsx
 * function useCitySearch({ params, query }) { … }
 * function useCitiesByValue({ values }) { … }
 *
 * const optionSources = { cities: { useOptions: useCitySearch, useSelectedOptions: useCitiesByValue } }
 * ```
 *
 * `values` is a **readonly array**, which is what lets one source serve both searchable kinds
 * unchanged: a `select` sends its single value as a one-element array, a `multiselect` sends
 * its whole selection, and neither needs a different source. An empty array means nothing is
 * selected — a source should report `loading: false` and an empty list rather than issuing a
 * request.
 */
export type SearchableOptionSource = {
	useOptions: (input: OptionSourceInput) => OptionSourceResult
	useSelectedOptions: (input: OptionSourceInput & { values: readonly OptionValue[] }) => OptionSourceResult
}

/**
 * Either form. A union, so **every source written against the plain function shape stays
 * valid** — this widening is not a breaking change for source authors, and a plain function
 * remains the right answer for any source that returns its whole list.
 */
export type OptionSource = SimpleOptionSource | SearchableOptionSource

/** Sources keyed by the name a schema's `optionsFrom` — or a field's — refers to. */
export type OptionSourceRegistry = Record<string, OptionSource>

/** Narrows a registry entry to the two-hook form; the plain function shape is callable. */
export function isSearchableSource(source: OptionSource): source is SearchableOptionSource {
	return typeof source !== 'function'
}
