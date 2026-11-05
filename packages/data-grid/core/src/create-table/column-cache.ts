/** An adapter owns one cache per table; each stage retains only its latest result. */
export function memoizeColumnValue<T>(
	cache: Map<string, unknown> | undefined,
	stage: string,
	inputs: readonly unknown[],
	create: () => T,
): T {
	// A stage's inputs determine its result type; the map crosses that generic boundary.
	const previous = cache?.get(stage) as { inputs: readonly unknown[]; value: T } | undefined
	if (previous?.inputs.length === inputs.length && inputs.every((value, i) => Object.is(value, previous.inputs[i]))) {
		return previous.value
	}
	const value = create()
	cache?.set(stage, { inputs, value })
	return value
}
