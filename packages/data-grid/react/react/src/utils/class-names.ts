/**
 * Joins class fragments, dropping the empty ones — `undefined` when nothing is left.
 *
 * Deliberately not a `cn`: this package emits no styling of its own, so there is nothing to
 * de-conflict. It only forwards classes the consumer wrote (`column.cellClassName`,
 * `rowProps().className`) alongside whatever the kit's own adapter adds.
 */
export function joinClassNames(...parts: (string | undefined | false)[]): string | undefined {
	const joined = parts.filter(Boolean).join(' ')
	return joined === '' ? undefined : joined
}

/**
 * Resolves a `cellClassName` that may be a literal or a per-cell function.
 * A throwing or absent resolver contributes nothing rather than breaking the row.
 */
export function resolveCellClassName(
	cellClassName: string | ((ctx: { row: unknown; value: unknown; rowIndex: number }) => string | undefined) | undefined,
	ctx: { row: unknown; value: unknown; rowIndex: number },
): string | undefined {
	if (cellClassName === undefined) return undefined
	return typeof cellClassName === 'function' ? cellClassName(ctx) : cellClassName
}
