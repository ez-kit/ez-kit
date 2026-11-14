import { packBlob, runMigration, STORAGE_VERSION } from './blob'
import { patchKeyed, removeKeyedScope } from './patch'

import type { MigrationConfig } from './blob'
import type { AmbientAdapter } from '../provider'
import type { CommitCtx, Keyed, ReadCtx, SyncSourcePort } from '../types'

export const LOCAL_STORAGE_SOURCE = 'localStorage'
export const SESSION_STORAGE_SOURCE = 'sessionStorage'
export const DEFAULT_STORAGE_KEY = 'ez-kit'
export type StorageMeta = { storageKey?: string }
export type StorageAdapterOptions = MigrationConfig & { storageKey?: string }

/** Synchronous failures propagate to the engine's shared reporter instead of becoming empty reads. */
export function createStoragePort(
	area: () => Storage | null,
	storageKey: string,
	migration: MigrationConfig = {},
): SyncSourcePort {
	const version = migration.version ?? STORAGE_VERSION
	function write(storage: Storage, values: Keyed): void {
		if (values.size) storage.setItem(storageKey, JSON.stringify(packBlob(values, version)))
		else storage.removeItem(storageKey)
	}
	function read(storage: Storage): { keyed: Keyed; rewrite: boolean } {
		const raw = storage.getItem(storageKey)
		if (raw === null) return { keyed: new Map(), rewrite: false }
		let value: unknown
		try {
			value = JSON.parse(raw)
		} catch {
			return { keyed: new Map(), rewrite: true }
		}
		return runMigration(value, migration)
	}
	return {
		capabilities: { recordVersions: true },
		get(context?: ReadCtx): Keyed {
			const storage = area()
			if (!storage) return new Map()
			const { keyed, rewrite } = read(storage)
			if (rewrite) {
				if (context) context.stageContainerRewrite?.(keyed)
				else write(storage, keyed)
			}
			return keyed
		},
		set(desired: Keyed, context: CommitCtx): void {
			const storage = area()
			if (!storage) return
			const rewrite = (context.meta as { containerRewrite?: unknown } | null)?.containerRewrite === true
			write(storage, rewrite ? desired : patchKeyed(read(storage).keyed, desired, context))
		},
		removeScope(path): void {
			const storage = area()
			if (storage) write(storage, removeKeyedScope(read(storage).keyed, path))
		},
		subscribe(onChange) {
			if (typeof window === 'undefined') return () => undefined
			const listener = (event: StorageEvent): void => {
				if ((event.key === null || event.key === storageKey) && event.storageArea === area()) onChange()
			}
			window.addEventListener('storage', listener)
			return () => {
				window.removeEventListener('storage', listener)
			}
		},
	}
}

export function localStorageAdapter(options: StorageAdapterOptions = {}): AmbientAdapter {
	const storageKey = options.storageKey ?? DEFAULT_STORAGE_KEY
	const port = createStoragePort(
		() => (typeof window === 'undefined' ? null : window.localStorage),
		storageKey,
		options,
	)
	port.identity = `localStorage:${storageKey}`
	return { source: LOCAL_STORAGE_SOURCE, port }
}

export function sessionStorageAdapter(options: StorageAdapterOptions = {}): AmbientAdapter {
	const storageKey = options.storageKey ?? DEFAULT_STORAGE_KEY
	const port = createStoragePort(
		() => (typeof window === 'undefined' ? null : window.sessionStorage),
		storageKey,
		options,
	)
	port.identity = `sessionStorage:${storageKey}`
	return { source: SESSION_STORAGE_SOURCE, port }
}
