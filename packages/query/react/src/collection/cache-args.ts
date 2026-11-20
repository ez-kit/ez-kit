/** @internal Reject transport objects that TanStack's JSON hash would collapse to the same key. */
export function collectionCacheArgs(value: unknown): unknown {
	const seen = new Set<object>()
	function check(item: unknown): void {
		if (item == null || typeof item === 'string' || typeof item === 'boolean') return
		if (typeof item === 'number' && Number.isFinite(item)) return
		if (typeof item === 'object' && !seen.has(item)) {
			const prototype: unknown = Object.getPrototypeOf(item)
			if (Array.isArray(item) || prototype === Object.prototype || prototype === null) {
				seen.add(item)
				for (const child of Object.values(item) as unknown[]) check(child)
				seen.delete(item)
				return
			}
		}
		throw new TypeError(
			'Collection query keys require plain serializable values. Use prepareKey for transport-only arguments.',
		)
	}
	check(value)
	return value
}
