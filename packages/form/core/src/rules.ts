/** A path from the root of the form values. `./`-prefixed refs are reserved for arrays. */
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

/** Reads `a.b[0].c` without throwing on a missing segment. */
export function getValueAtPath(values: unknown, path: string): unknown {
	const segments = path.replace(/\[(\d+)\]/g, '.$1').split('.')
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
	const segments = path.replace(/\[(\d+)\]/g, '.$1').split('.')
	return writeAtSegments(values, segments, value) as TValues
}

function assertAbsolute(field: FieldRef): void {
	if (field.startsWith(RELATIVE_PREFIX)) {
		throw new Error(
			`Relative field reference "${field}" is reserved for array items and is not supported in FormSchema v1.`,
		)
	}
}

export function compileCondition<TValues>(condition: Condition<TValues>): (values: TValues) => boolean {
	if (typeof condition === 'function') return condition

	if ('and' in condition) {
		const parts = condition.and.map((rule) => compileCondition<TValues>(rule))
		return (values) => parts.every((part) => part(values))
	}
	if ('or' in condition) {
		const parts = condition.or.map((rule) => compileCondition<TValues>(rule))
		return (values) => parts.some((part) => part(values))
	}
	if ('not' in condition) {
		const inner = compileCondition<TValues>(condition.not)
		return (values) => !inner(values)
	}

	assertAbsolute(condition.field)
	const read = (values: TValues): unknown => getValueAtPath(values, condition.field)

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

/** Which fields a condition reads — used to subscribe narrowly. Empty means "unknown". */
export function collectRuleFields<TValues>(condition: Condition<TValues>): string[] {
	if (typeof condition === 'function') return []
	if ('and' in condition) return condition.and.flatMap((rule) => collectRuleFields(rule))
	if ('or' in condition) return condition.or.flatMap((rule) => collectRuleFields(rule))
	if ('not' in condition) return collectRuleFields(condition.not)
	return [condition.field]
}
