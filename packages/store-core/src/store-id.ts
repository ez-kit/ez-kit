/**
 * Structural identity of a cached instance: where (`path`), which group (`name`), which entry (`id`).
 * Manager-agnostic — references no store manager (Zustand/Valtio) or React type.
 */
export type StoreId = {
	path: readonly string[]
	name: string
	id: string
}

/** Canonical map identity for a store. JSON-encoded so no delimiter can collide across segments. */
export function serializeStoreId(id: StoreId): string {
	return JSON.stringify([id.path, id.name, id.id])
}

/** Inverse of {@link serializeStoreId}: rebuild a `StoreId` from its serialized form. */
export function deserializeStoreId(serialized: string): StoreId {
	const [path, name, id] = JSON.parse(serialized) as [readonly string[], string, string]
	return { path, name, id }
}
