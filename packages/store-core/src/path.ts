/**
 * Walking and addressing helpers for path-based field access.
 *
 * A path is the ordered list of property segments from a store's state root to a leaf
 * (`['filters','price','min']`). Two write strategies live here because the two store managers
 * need different ones: {@link writePath} mutates in place (Valtio — the proxy IS the state and
 * intermediate nodes must keep their identity), {@link setPath} rebuilds the spine immutably
 * (Zustand — a write must produce a new state object or `Object.is` selectors never re-render).
 */

type AnyRecord = Record<string, unknown>

function isWalkable(value: unknown): value is AnyRecord {
	return value !== null && typeof value === 'object'
}

/** Read the value at `path`, or `undefined` if any intermediate node is missing. */
export function readPath(root: object, path: readonly string[]): unknown {
	let current: unknown = root
	for (const segment of path) {
		if (!isWalkable(current)) {
			return undefined
		}
		current = current[segment]
	}
	return current
}

/** Resolve the parent object of the leaf addressed by `path`, or `undefined` if unreachable. */
export function parentOf(root: object, path: readonly string[]): AnyRecord | undefined {
	let current: unknown = root
	for (const segment of path.slice(0, -1)) {
		if (!isWalkable(current)) {
			return undefined
		}
		current = current[segment]
	}
	return isWalkable(current) ? current : undefined
}

/**
 * Assign the leaf addressed by `path`, mutating in place. Only the leaf slot is written —
 * intermediate nodes (class instances, nested proxies) keep their identity. A path whose parent is
 * unreachable is a no-op.
 */
export function writePath(root: object, path: readonly string[], value: unknown): void {
	const parent = parentOf(root, path)
	const leaf = path[path.length - 1]
	if (parent === undefined || leaf === undefined) {
		return
	}
	parent[leaf] = value
}

/**
 * Return a copy of `root` with the leaf addressed by `path` set to `value`. Every node on the path
 * is shallow-copied (arrays as arrays, plain objects as objects), so the result is a new reference
 * all the way down while untouched branches keep theirs — what a `Object.is`-comparing selector
 * needs to see exactly the change and nothing else.
 *
 * A path whose parent is unreachable returns `root` untouched, and so does a write of the value the
 * leaf already holds: an identical result must stay reference-identical, otherwise every hydration
 * pass would notify subscribers about a change that did not happen.
 */
export function setPath<T extends object>(root: T, path: readonly string[], value: unknown): T {
	const [segment, ...rest] = path
	if (segment === undefined) {
		return root
	}
	if (!isWalkable(root)) {
		return root
	}

	const current = (root as AnyRecord)[segment]
	if (rest.length === 0) {
		if (Object.is(current, value)) {
			return root
		}
		return withProperty(root, segment, value)
	}

	if (!isWalkable(current)) {
		// Unreachable intermediate node: leave the tree alone rather than fabricating one.
		return root
	}
	const next = setPath(current, rest, value)
	if (Object.is(next, current)) {
		return root
	}
	return withProperty(root, segment, next)
}

/** Shallow-copy `source` with one property replaced, preserving array-ness. */
function withProperty<T extends object>(source: T, key: string, value: unknown): T {
	if (Array.isArray(source)) {
		const copy = [...source] as unknown as AnyRecord
		copy[key] = value
		return copy as unknown as T
	}
	return { ...(source as AnyRecord), [key]: value } as T
}

/** Find a property descriptor anywhere on the prototype chain (for getter/setter checks). */
export function findPropertyDescriptor(target: object, key: string): PropertyDescriptor | undefined {
	let current: object | null = target
	while (current !== null) {
		const descriptor = Object.getOwnPropertyDescriptor(current, key)
		if (descriptor) {
			return descriptor
		}
		current = Object.getPrototypeOf(current) as object | null
	}
	return undefined
}
