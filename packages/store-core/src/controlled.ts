/**
 * Per-field override for a controlled field: `equals` replaces the default `Object.is` comparison
 * (for example {@link shallowEqual}, when the caller derives a fresh reference for `value` every
 * render), and `set` replaces the default direct-assignment write (for example routing the value
 * through a store action instead of writing the field directly).
 */
export type ControlledFieldConfig<TState, K extends keyof TState = keyof TState> = {
	equals?: (previous: TState[K], next: TState[K]) => boolean
	set?: (store: TState, value: TState[K]) => void
}

/**
 * Per-key overrides for the fields a `value` prop may control. Every key is optional — a key
 * absent here still becomes controlled once it appears in `value`, just with the default
 * `Object.is` comparison and a direct-assignment write.
 */
export type ControlledConfig<TState> = {
	[K in keyof TState]?: ControlledFieldConfig<TState, K>
}

/** Shallow structural equality for arrays and plain objects; falls back to `Object.is`. */
export function shallowEqual(a: unknown, b: unknown): boolean {
	if (Object.is(a, b)) return true
	if (typeof a !== 'object' || a === null || typeof b !== 'object' || b === null) return false

	if (Array.isArray(a) || Array.isArray(b)) {
		if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false
		return a.every((item, index) => Object.is(item, b[index]))
	}

	const aRecord = a as Record<string, unknown>
	const bRecord = b as Record<string, unknown>
	const aKeys = Object.keys(aRecord)
	const bKeys = Object.keys(bRecord)
	if (aKeys.length !== bKeys.length) return false

	return aKeys.every((key) => Object.hasOwn(bRecord, key) && Object.is(aRecord[key], bRecord[key]))
}

/**
 * Compares `previous` against `next` key by key — using `controlled[key].equals` when declared,
 * `Object.is` otherwise — and returns only the entries whose value changed. A key present in
 * `next` but absent from `previous` always counts as changed, which is what makes this function
 * double as the initial-mount application: call it with `previous` as `undefined`.
 */
export function getChangedControlledEntries<TState>(
	previous: Partial<TState> | undefined,
	next: Partial<TState> | undefined,
	controlled: ControlledConfig<TState> = {},
): Partial<TState> {
	const changed: Partial<TState> = {}
	if (!next) return changed

	for (const key of Object.keys(next) as (keyof TState)[]) {
		const nextValue = next[key] as TState[typeof key]

		if (!previous || !Object.hasOwn(previous, key)) {
			changed[key] = nextValue
			continue
		}

		const equals = controlled[key]?.equals ?? Object.is
		const previousValue = previous[key] as TState[typeof key]
		if (!equals(previousValue, nextValue)) {
			changed[key] = nextValue
		}
	}

	return changed
}

/**
 * Projects `source` down to `keys`, in `Partial<TState>` shape. Used to build the payload emitted
 * to `onValueChange`, restricted to the keys the current `value` prop actually controls.
 */
export function pickControlledKeys<TState>(source: TState, keys: readonly (keyof TState)[]): Partial<TState> {
	const picked: Partial<TState> = {}
	for (const key of keys) {
		picked[key] = source[key]
	}
	return picked
}
