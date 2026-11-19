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

/** One persisted value within an instance. Source names are scoped by the owning registry. */
export type PersistAddress = {
	store: StoreId
	field: readonly string[]
}

const RECORD_PREFIX = 'ez-kit:record:'

/** Canonical, recognisable storage key; punctuation in user ids never acts as a separator. */
export function serializePersistAddress(address: PersistAddress): string {
	return RECORD_PREFIX + JSON.stringify([serializeStoreId(address.store), address.field])
}

/** Unknown/legacy keys are deliberately not guessed or assigned an owner. */
export function deserializePersistAddress(key: string): PersistAddress | undefined {
	if (!key.startsWith(RECORD_PREFIX)) return undefined
	try {
		const value: unknown = JSON.parse(key.slice(RECORD_PREFIX.length))
		if (!Array.isArray(value) || value.length !== 2) return undefined
		const [serialized, field] = value as unknown[]
		if (typeof serialized !== 'string' || !isStringArray(field)) return undefined
		const tuple: unknown = JSON.parse(serialized)
		if (!Array.isArray(tuple) || tuple.length !== 3) return undefined
		const [path, name, id] = tuple as unknown[]
		if (!isStringArray(path) || typeof name !== 'string' || typeof id !== 'string') return undefined
		return { store: { path, name, id }, field }
	} catch {
		return undefined
	}
}

function isStringArray(value: unknown): value is string[] {
	return Array.isArray(value) && value.every((segment: unknown) => typeof segment === 'string')
}

/** Scope membership is structural, not a string-prefix operation. */
export function isWithinScope(path: readonly string[], scope: readonly string[]): boolean {
	return scope.length <= path.length && scope.every((segment, index) => path[index] === segment)
}
