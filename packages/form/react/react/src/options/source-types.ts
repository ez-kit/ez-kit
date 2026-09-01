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
export type OptionSource = (input: OptionSourceInput) => OptionSourceResult

/** Sources keyed by the name a schema's `optionsFrom` — or a field's — refers to. */
export type OptionSourceRegistry = Record<string, OptionSource>
