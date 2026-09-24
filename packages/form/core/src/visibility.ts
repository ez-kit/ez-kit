import { compileCondition, toSegments } from './rules'
import { hasValue, walkInstances } from './walk'

import type { AnyFormSchema, FormNode } from './schema'

function isNodeVisible(node: FormNode<unknown, string>, values: unknown, itemPath: string | undefined): boolean {
	return node.when === undefined || compileCondition<unknown>(node.when, itemPath)(values)
}

/**
 * Every value path the schema shows for these values, expanded per array item.
 *
 * Visibility is decided **while descending**, not afterwards: a hidden container prunes its
 * subtree on the spot. Re-deriving it from an ancestor chain would mean evaluating each
 * ancestor's `when` outside the item it was written in, and a `./`-prefixed condition has no
 * meaning there.
 */
export function visibleFieldNames<TValues>(schema: AnyFormSchema<TValues>, values: TValues): Set<string> {
	const visible = new Set<string>()
	walkInstances(schema, values, ({ node, path, itemPath }) => {
		if (!isNodeVisible(node, values, itemPath)) return false
		if (path !== undefined && hasValue(node)) visible.add(path)
		return true
	})
	return visible
}

/** Every value path the schema declares for these values, visible or not. */
function ownedFieldPaths<TValues>(schema: AnyFormSchema<TValues>, values: TValues): string[] {
	const paths: string[] = []
	walkInstances(schema, values, ({ node, path }) => {
		if (path !== undefined && hasValue(node)) paths.push(path)
	})
	return paths
}

/**
 * Removes one key, rebuilding only the objects along the way.
 *
 * An index segment is traversed but never removed: hiding a field inside an item must not
 * shorten the list and renumber its neighbours.
 */
function omitAtPath(container: unknown, segments: readonly string[]): unknown {
	const [segment, ...rest] = segments
	if (segment === undefined || container === null || typeof container !== 'object') return container

	if (rest.length === 0) {
		if (Array.isArray(container)) return container
		const { [segment]: _removed, ...kept } = container as Record<string, unknown>
		return kept
	}

	const child = (container as Record<string, unknown>)[segment]
	const next = omitAtPath(child, rest)
	if (next === child) return container

	if (Array.isArray(container)) {
		const copy = [...(container as unknown[])]
		copy[Number(segment)] = next
		return copy
	}
	return { ...(container as Record<string, unknown>), [segment]: next }
}

/**
 * Drops the values of fields the schema currently hides, so a conditional branch the user never
 * saw is not submitted.
 *
 * Only paths the schema **owns** are touched: anything the form carries but does not declare
 * passes through untouched.
 *
 * This reaches nested paths, which it did not before arrays existed. Back then nesting was
 * opt-in — you had to write `company.inn` — and a hidden nested field survived into the payload
 * because its parent object was not itself owned. Inside an array item everything is nested by
 * construction, so that hole would have applied to every conditional field in every item.
 */
export function stripHiddenValues<TValues>(schema: AnyFormSchema<TValues>, values: TValues): TValues {
	const visible = visibleFieldNames(schema, values)
	let result: unknown = values
	for (const path of ownedFieldPaths(schema, values)) {
		if (visible.has(path)) continue
		result = omitAtPath(result, toSegments(path))
	}
	return result as TValues
}
