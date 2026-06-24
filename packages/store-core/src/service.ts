declare const SERVICE: unique symbol

/**
 * A branded service key. Carries the service value type `S` at compile time while remaining a stable
 * string `id` at runtime. Two keys created with the same `id` refer to the same service slot.
 */
export type ServiceKey<S> = { readonly [SERVICE]: S; readonly id: string }

/** Create a branded {@link ServiceKey} for service value type `S`. The brand exists only at the type level. */
export function serviceKey<S>(id: string): ServiceKey<S> {
	return { id } as ServiceKey<S>
}

/** App-level dependency lookup for plugins. `get` throws when absent; `safeGet` returns `undefined`. */
export type ServiceRegistry = {
	get<S>(key: ServiceKey<S>): S
	safeGet<S>(key: ServiceKey<S>): S | undefined
}

function fromEntries(entries: readonly (readonly [ServiceKey<unknown>, unknown])[] | undefined): Map<string, unknown> {
	const byId = new Map<string, unknown>()
	if (!entries) return byId
	for (const [key, value] of entries) byId.set(key.id, value)
	return byId
}

function registryFromMap(byId: ReadonlyMap<string, unknown>): ServiceRegistry {
	return {
		get<S>(key: ServiceKey<S>): S {
			if (!byId.has(key.id)) throw new Error(`[store-core] service not mounted: ${key.id}`)
			return byId.get(key.id) as S
		},
		safeGet<S>(key: ServiceKey<S>): S | undefined {
			return byId.get(key.id) as S | undefined
		},
	}
}

/** Build a registry from an optional list of `[key, value]` entries, keyed by `key.id`. */
export function createServiceRegistry(entries?: readonly (readonly [ServiceKey<unknown>, unknown])[]): ServiceRegistry {
	return registryFromMap(fromEntries(entries))
}

/**
 * Immutably extend a registry with more entries. Later entries override earlier ones by `id`.
 * Used by consumers to layer services for nested providers without mutating the base registry.
 */
export function extendServiceRegistry(
	base: ServiceRegistry | undefined,
	entries: readonly (readonly [ServiceKey<unknown>, unknown])[],
): ServiceRegistry {
	const merged = new Map<string, unknown>()
	if (base) {
		// Re-resolve every key the new entries reference plus any the base exposes via safeGet.
		// The base registry has no enumeration API, so we seed from the new keys and rely on safeGet
		// for overlaps; non-overlapping base entries remain reachable through the wrapped lookups.
		for (const [key] of entries) {
			const existing = base.safeGet(key)
			if (existing !== undefined) merged.set(key.id, existing)
		}
	}
	for (const [key, value] of entries) merged.set(key.id, value)

	const overlay = registryFromMap(merged)
	if (!base) return overlay

	return {
		get<S>(key: ServiceKey<S>): S {
			const own = overlay.safeGet(key)
			if (own !== undefined) return own
			return base.get(key)
		},
		safeGet<S>(key: ServiceKey<S>): S | undefined {
			return overlay.safeGet(key) ?? base.safeGet(key)
		},
	}
}
