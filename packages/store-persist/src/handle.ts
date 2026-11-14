import { PACKAGE_TAG } from './package-tag'
import { URL_SOURCE } from './url/adapter'

import type { PersistBinding } from './binding'
import type { PersistStatus, RestoreOptions, RestoreResult } from './types'
import type { UrlMeta } from './url/adapter'

export const URL_HANDLE = '$url'
export const PERSIST_HANDLE = '$persist'
export type SourceBinding = { source: string; binding: PersistBinding }

export type PersistHandle = {
	readonly source: string | null
	runWithMeta(meta: unknown, mutate: () => void): void
	getStatus(): PersistStatus
	subscribe(listener: () => void): () => void
	restore(options?: RestoreOptions): Promise<RestoreResult>
	flush(): Promise<void>
	reset(options?: { fields?: readonly (readonly string[])[] }): Promise<void>
}
export type UrlHandle = Omit<PersistHandle, 'runWithMeta'> & { runWithMeta(meta: UrlMeta, mutate: () => void): void }
export type PersistHandles = { [URL_HANDLE]: UrlHandle; [PERSIST_HANDLE]: PersistHandle }

const entriesByStore = new WeakMap<object, SourceBinding[]>()
const handlesByStore = new WeakMap<object, Map<string, PersistHandle>>()
const INERT_STATUS: PersistStatus = { restore: 'idle', write: 'idle', dirty: false, writeBlocked: null, error: null }

function handleFor(store: object, slot: string): PersistHandle {
	let handles = handlesByStore.get(store)
	if (!handles) {
		handles = new Map()
		handlesByStore.set(store, handles)
	}
	const existing = handles.get(slot)
	if (existing) return existing
	const entry = (): SourceBinding | undefined => {
		const entries = entriesByStore.get(store) ?? []
		if (slot === PERSIST_HANDLE) return entries.find((item) => item.source !== URL_SOURCE)
		return entries.find((item) => item.source === (slot === URL_HANDLE ? URL_SOURCE : slot))
	}
	const handle: PersistHandle = {
		get source() {
			const source = entry()?.source
			return source === '' ? null : (source ?? null)
		},
		runWithMeta(meta, mutate) {
			const controller = entry()?.binding.controller
			if (controller) controller.runWithMeta(meta, mutate)
			else mutate()
		},
		getStatus() {
			return entry()?.binding.status ?? INERT_STATUS
		},
		subscribe(listener) {
			const binding = entry()?.binding
			binding?.listeners.add(listener)
			return () => {
				binding?.listeners.delete(listener)
			}
		},
		restore(options) {
			const binding = entry()?.binding
			return binding?.controller?.restore?.(binding, options) ?? Promise.resolve({ status: 'idle' })
		},
		flush() {
			const binding = entry()?.binding
			return binding?.controller?.flush?.(binding) ?? Promise.resolve()
		},
		reset(options) {
			const binding = entry()?.binding
			return (
				binding?.controller?.reset?.(binding, options?.fields) ??
				Promise.reject(new Error(`${PACKAGE_TAG} Cannot reset disconnected persistence`))
			)
		},
	}
	handles.set(slot, handle)
	return handle
}

export function attachHandles(store: object, bindings: SourceBinding[]): void {
	entriesByStore.set(store, bindings)
	for (const slot of [URL_HANDLE, PERSIST_HANDLE]) {
		if (!Object.prototype.hasOwnProperty.call(store, slot))
			Object.defineProperty(store, slot, {
				value: handleFor(store, slot),
				enumerable: false,
				configurable: true,
				writable: false,
			})
	}
}

function requireHandle(store: object, slot: string): PersistHandle {
	if (!entriesByStore.has(store))
		throw new Error(`${PACKAGE_TAG} no "${slot}" handle; ensure the store uses withPersist`)
	return handleFor(store, slot)
}

export function urlHandle(store: object): UrlHandle {
	return requireHandle(store, URL_HANDLE)
}
export function persistHandle(store: object, source?: string): PersistHandle {
	return requireHandle(store, source ?? PERSIST_HANDLE)
}
