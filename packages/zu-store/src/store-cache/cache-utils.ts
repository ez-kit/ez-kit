import type { CacheAddress } from './types'
import type { StoreId } from '@ez-kit/store-core'

/** Shared empty-path sentinel for `path?` defaults. */
export const EMPTY_PATH: readonly string[] = []

/**
 * Canonical identity for a store, used locally for React `key`s and `useMemo` deps. JSON-encoded so
 * no delimiter can collide across path segments. (The cache does its own keying internally.)
 */
export function serializeStoreId(storeId: StoreId): string {
	return JSON.stringify([storeId.path, storeId.name, storeId.id])
}

/** Build a `StoreId` from a public-facing target plus its group name. */
export function toStoreId(target: CacheAddress, name: string): StoreId {
	return { path: target.path ?? EMPTY_PATH, name, id: target.id }
}
