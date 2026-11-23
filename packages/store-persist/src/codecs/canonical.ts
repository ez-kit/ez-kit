type Nested = Record<string, unknown>

/** Canonicalize serialized JSON, preserving toJSON semantics and ignoring object key insertion order. */
export function canonicalStringify(value: unknown): string | undefined {
	const serialized = JSON.stringify(value) as string | undefined
	if (serialized === undefined) return undefined
	return JSON.stringify(sortKeys(JSON.parse(serialized) as unknown))
}

function sortKeys(value: unknown): unknown {
	if (Array.isArray(value)) return value.map(sortKeys)
	if (value === null || typeof value !== 'object') {
		return value
	}
	const source = value as Nested
	// fromEntries defines own data properties, including __proto__, instead of invoking setters.
	return Object.fromEntries(
		Object.keys(source)
			.sort()
			.map((key) => [key, sortKeys(source[key])]),
	)
}
