import type { InvalidateQueryFilters, QueryKey } from '@tanstack/react-query'

/** Each filter selects one cache family; array elements in a queryKey are one key. */
export type InvalidationPolicy =
	| false
	| { additional: readonly InvalidateQueryFilters[]; replace?: never }
	| { replace: readonly InvalidateQueryFilters[]; additional?: never }

/** Apply one explicit policy layer without mutating the inherited rules. */
export function resolveInvalidation(
	inherited: readonly InvalidateQueryFilters[],
	policy: InvalidationPolicy | undefined,
): readonly InvalidateQueryFilters[] {
	if (policy === undefined) return inherited
	if (policy === false) return []
	if (policy.replace !== undefined) return policy.replace
	return [...inherited, ...policy.additional]
}

/** Cache families of a unified collection. */
export function collectionInvalidation(key: QueryKey): readonly InvalidateQueryFilters[] {
	return [{ queryKey: [...key, 'pages'] }, { queryKey: [...key, 'infinite'] }]
}
