import type { FieldDescriptor } from '../types'

type Nested = Record<string, unknown>

/** The structural path a field occupies inside a nested layout (json/qs). `absolute` is ignored here. */
export function nestedPath(field: FieldDescriptor): string[] {
	const leaf = field.key ?? field.path.at(-1) ?? ''
	return [...field.path.slice(0, -1), leaf]
}

/** Read a leaf string from a nested object by path, or `undefined` if absent / not a string. */
export function readNested(root: unknown, path: string[]): string | undefined {
	let current: unknown = root
	for (const segment of path) {
		if (current === null || typeof current !== 'object') {
			return undefined
		}
		current = (current as Nested)[segment]
	}
	return typeof current === 'string' ? current : undefined
}

/** Set a leaf string in a nested object by path, creating intermediate objects as needed. */
export function setNested(root: Nested, path: string[], value: string): void {
	const leaf = path.at(-1)
	if (leaf === undefined) {
		return
	}
	let current = root
	for (const segment of path.slice(0, -1)) {
		const existing = current[segment]
		if (existing === null || typeof existing !== 'object') {
			const created: Nested = {}
			current[segment] = created
			current = created
		} else {
			current = existing as Nested
		}
	}
	current[leaf] = value
}

/** Remove a leaf from a nested object by path, leaving any (now-empty) parents in place. */
export function deleteNested(root: Nested, path: string[]): void {
	const leaf = path.at(-1)
	if (leaf === undefined) {
		return
	}
	let current: unknown = root
	for (const segment of path.slice(0, -1)) {
		if (current === null || typeof current !== 'object') {
			return
		}
		current = (current as Nested)[segment]
	}
	if (current !== null && typeof current === 'object') {
		Reflect.deleteProperty(current, leaf)
	}
}

/** Stable, recursively key-sorted JSON so the engine's equality guard is reliable. */
export function canonicalStringify(value: unknown): string {
	return JSON.stringify(sortKeys(value))
}

function sortKeys(value: unknown): unknown {
	if (value === null || typeof value !== 'object' || Array.isArray(value)) {
		return value
	}
	const source = value as Nested
	const ordered: Nested = {}
	for (const key of Object.keys(source).sort()) {
		ordered[key] = sortKeys(source[key])
	}
	return ordered
}
