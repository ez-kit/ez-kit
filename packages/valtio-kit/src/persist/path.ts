/** Walking and addressing helpers for path-based field access (identity-preserving writes). */

type AnyRecord = Record<string, unknown>

function isWalkable(value: unknown): value is AnyRecord {
	return value !== null && typeof value === 'object'
}

/** Read the value at `path`, or `undefined` if any intermediate node is missing. */
export function readPath(root: object, path: string[]): unknown {
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
export function parentOf(root: object, path: string[]): AnyRecord | undefined {
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
 * intermediate nodes (class instances, nested proxies) keep their identity.
 */
export function writePath(root: object, path: string[], value: unknown): void {
	const parent = parentOf(root, path)
	const leaf = path[path.length - 1]
	if (parent === undefined || leaf === undefined) {
		return
	}
	parent[leaf] = value
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
