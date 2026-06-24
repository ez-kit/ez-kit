type Nested = Record<string, unknown>

/** Stable, recursively key-sorted JSON so equality comparison is insensitive to key insertion order. */
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
