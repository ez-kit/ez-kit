/**
 * A path from the root of the form values, or — inside an array item — a `./`-prefixed path
 * relative to that item.
 *
 * The relative form exists because an item's index is not knowable when the schema is authored:
 * a condition written on a field of `people` must mean "this person's `type`", not
 * "`people[3].type`". Only one level of relativity is offered: there is no `../`, so `./` always
 * means "the item I am in" and an absolute ref always means "the form root". A condition inside
 * an item may still read a root-level field by writing it absolutely.
 */
export type FieldRef = string

export type Rule =
	| { field: FieldRef; eq: unknown }
	| { field: FieldRef; in: readonly unknown[] }
	| { field: FieldRef; gt: number }
	| { field: FieldRef; lt: number }
	| { field: FieldRef; truthy: true }
	| { and: readonly Rule[] }
	| { or: readonly Rule[] }
	| { not: Rule }

export type Condition<TValues> = Rule | ((values: TValues) => boolean)

const RELATIVE_PREFIX = './'

const INDEX_BRACKETS = /\[(\d+)\]/g

/**
 * Splits `a.b[0].c` into `['a', 'b', '0', 'c']`, normalising the two spellings of an index so a
 * path written either way reads and writes the same place.
 */
export function toSegments(path: string): string[] {
	return path.replace(INDEX_BRACKETS, '.$1').split('.')
}

/**
 * The same split, with index segments as **numbers** — the shape Standard Schema expects in an
 * issue `path`, where a string `'0'` would address a property rather than an array entry.
 */
export function toIssuePath(path: string): (string | number)[] {
	return toSegments(path).map((segment) => (/^\d+$/.test(segment) ? Number(segment) : segment))
}

/** Reads `a.b[0].c` without throwing on a missing segment. */
export function getValueAtPath(values: unknown, path: string): unknown {
	const segments = toSegments(path)
	let current: unknown = values
	for (const segment of segments) {
		if (current === null || typeof current !== 'object') return undefined
		current = (current as Record<string, unknown>)[segment]
	}
	return current
}

/** Whether a normalised path segment addresses an array index rather than an object key. */
function isIndexSegment(segment: string): boolean {
	return /^\d+$/.test(segment)
}

/**
 * Writes one segment of an already-normalised path, recursing into the rest.
 *
 * Never mutates `container`: every level is rebuilt as a fresh array or object, and a level
 * whose existing value is not a suitable container (missing, `null`, a scalar, or the wrong
 * kind for the segment) is replaced by a new empty one rather than written through.
 */
function writeAtSegments(container: unknown, segments: readonly string[], value: unknown): unknown {
	const [segment, ...rest] = segments
	if (segment === undefined) return value

	const child =
		container === null || typeof container !== 'object' ? undefined : (container as Record<string, unknown>)[segment]
	const nextChild = writeAtSegments(child, rest, value)

	if (isIndexSegment(segment)) {
		const next = Array.isArray(container) ? [...(container as unknown[])] : []
		next[Number(segment)] = nextChild
		return next
	}

	const base =
		container !== null && typeof container === 'object' && !Array.isArray(container)
			? (container as Record<string, unknown>)
			: {}
	return { ...base, [segment]: nextChild }
}

/**
 * Writes `a.b[0].c` into a **copy** of `values`, creating the intermediate containers it needs.
 *
 * The mirror image of `getValueAtPath`, down to the same `[n]` → `.n` normalisation, so a path
 * that reads back through one writes through the other. Purely functional: `values` is never
 * touched, and only the objects along the written path are re-created.
 */
export function setValueAtPath<TValues>(values: TValues, path: string, value: unknown): TValues {
	return writeAtSegments(values, toSegments(path), value) as TValues
}

/**
 * Turns a ref into a path from the form root, joining a `./` one onto the item it was written
 * in. Absolute refs pass through untouched, which is what lets a field inside an item depend on
 * a root-level one.
 *
 * A relative ref with no `itemPath` is a schema error, not a silent read of the root: it can
 * only mean the author expected an item scope that is not there.
 */
function resolveRef(field: FieldRef, itemPath: string | undefined): string {
	if (!field.startsWith(RELATIVE_PREFIX)) return field
	if (itemPath === undefined) {
		throw new Error(
			`Relative field reference "${field}" is only valid inside an array item; there is no item scope here.`,
		)
	}
	return `${itemPath}.${field.slice(RELATIVE_PREFIX.length)}`
}

/**
 * @param itemPath the array item the condition was written inside (e.g. `people[1]`), which
 * `./`-prefixed refs resolve against. Omitted everywhere outside an array item.
 */
export function compileCondition<TValues>(
	condition: Condition<TValues>,
	itemPath?: string,
): (values: TValues) => boolean {
	if (typeof condition === 'function') return condition

	if ('and' in condition) {
		const parts = condition.and.map((rule) => compileCondition<TValues>(rule, itemPath))
		return (values) => parts.every((part) => part(values))
	}
	if ('or' in condition) {
		const parts = condition.or.map((rule) => compileCondition<TValues>(rule, itemPath))
		return (values) => parts.some((part) => part(values))
	}
	if ('not' in condition) {
		const inner = compileCondition<TValues>(condition.not, itemPath)
		return (values) => !inner(values)
	}

	// Resolved once, when the condition is compiled — not per evaluation.
	const path = resolveRef(condition.field, itemPath)
	const read = (values: TValues): unknown => getValueAtPath(values, path)

	if ('eq' in condition) return (values) => read(values) === condition.eq
	if ('in' in condition) return (values) => condition.in.includes(read(values))
	if ('truthy' in condition) return (values) => Boolean(read(values))
	if ('gt' in condition) {
		return (values) => {
			const value = read(values)
			return typeof value === 'number' && value > condition.gt
		}
	}
	return (values) => {
		const value = read(values)
		return typeof value === 'number' && value < condition.lt
	}
}

/**
 * Which fields a condition reads — used to subscribe narrowly. Empty means "unknown".
 *
 * Paths come back resolved against `itemPath`, because a subscription has to name the real
 * path in form state; a caller handed `./type` could not subscribe to anything.
 */
export function collectRuleFields<TValues>(condition: Condition<TValues>, itemPath?: string): string[] {
	if (typeof condition === 'function') return []
	if ('and' in condition) return condition.and.flatMap((rule) => collectRuleFields(rule, itemPath))
	if ('or' in condition) return condition.or.flatMap((rule) => collectRuleFields(rule, itemPath))
	if ('not' in condition) return collectRuleFields(condition.not, itemPath)
	return [resolveRef(condition.field, itemPath)]
}
