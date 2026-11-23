import { PACKAGE_TAG } from './package-tag'
import { URL_SOURCE } from './url/adapter'

import type { PersistBinding } from './binding'
import type { PersistStatus, RestoreCallOptions, RestoreResult } from './types'
import type { UrlMeta } from './url/adapter'

export const URL_HANDLE = '$url'
export const PERSIST_HANDLE = '$persist'
export type SourceBinding = { source: string; binding: PersistBinding }

/** Possible state paths; runtime validation additionally checks that the selected source persists them. */
export type PersistFieldPath<T, Depth extends readonly unknown[] = []> = Depth['length'] extends 8
	? readonly string[]
	: T extends readonly (infer Item)[]
		? | readonly [`${number}`]
			| (NonNullable<Item> extends object
					? readonly [`${number}`, ...PersistFieldPath<NonNullable<Item>, [...Depth, unknown]>]
					: never)
		: string extends keyof T
			? readonly string[]
			: keyof T extends never
				? readonly string[]
				: {
						[K in Exclude<Extract<keyof T, string | number>, typeof URL_HANDLE | typeof PERSIST_HANDLE>]: NonNullable<
							T[K]
						> extends (...args: never[]) => unknown
							? never
							: | readonly [`${K}`]
								| (NonNullable<T[K]> extends Date
										? never
										: NonNullable<T[K]> extends object
											? readonly [`${K}`, ...PersistFieldPath<NonNullable<T[K]>, [...Depth, unknown]>]
											: never)
					}[Exclude<Extract<keyof T, string | number>, typeof URL_HANDLE | typeof PERSIST_HANDLE>]

// A business method named getState does not make a proxy a store handle.
// Recognize the complete structural surface without importing a state manager here.
type PersistState<T> = T extends {
	getState(): infer State
	getInitialState(): unknown
	setState: (...args: never[]) => unknown
	subscribe: (...args: never[]) => unknown
}
	? State
	: T

export type PersistHandle<TState = object> = {
	readonly source: string | null
	runWithMeta(meta: unknown, mutate: () => void): void
	getStatus(): PersistStatus
	subscribe(listener: () => void): () => void
	restore(options?: RestoreCallOptions): Promise<RestoreResult>
	flush(): Promise<void>
	reset(options?: { fields?: readonly PersistFieldPath<TState>[] }): Promise<void>
}
export type UrlHandle<TState = object> = Omit<PersistHandle<TState>, 'runWithMeta'> & {
	runWithMeta(meta: UrlMeta, mutate: () => void): void
}
export type PersistHandles<TState = object> = {
	[URL_HANDLE]: UrlHandle<TState>
	[PERSIST_HANDLE]: PersistHandle<TState>
}

// Public source names must never double as private shorthand selectors.
const DEFAULT_URL = Symbol('default URL handle')
const DEFAULT_PERSIST = Symbol('default persistence handle')
type Selector = string | typeof DEFAULT_URL | typeof DEFAULT_PERSIST
const entriesByStore = new WeakMap<object, SourceBinding[]>()
const handlesByStore = new WeakMap<object, Map<Selector, PersistHandle>>()
const INERT_STATUS: PersistStatus = { restore: 'idle', write: 'idle', dirty: false, writeBlocked: null, error: null }

function unknownSource(source: string, entries: readonly SourceBinding[]): Error {
	const names = entries.map((entry) => entry.source).filter(Boolean)
	return new Error(`${PACKAGE_TAG} Unknown persistence source "${source}"; available: ${names.join(', ') || '(none)'}`)
}

function selectEntry(store: object, selector: Selector): SourceBinding | undefined {
	const entries = entriesByStore.get(store) ?? []
	if (selector === DEFAULT_PERSIST) return entries.find((item) => item.source !== URL_SOURCE)
	if (selector === DEFAULT_URL) return entries.find((item) => item.source === URL_SOURCE)
	const found = entries.find((item) => item.source === selector)
	if (!found) throw unknownSource(selector, entries)
	return found
}

function handleFor(store: object, selector: Selector): PersistHandle {
	let handles = handlesByStore.get(store)
	if (!handles) {
		handles = new Map()
		handlesByStore.set(store, handles)
	}
	const existing = handles.get(selector)
	if (existing) return existing
	const entry = (): SourceBinding | undefined => selectEntry(store, selector)
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
			const controller = binding?.controller
			if (controller?.flush && binding) return controller.flush(binding)
			if (binding) return Promise.reject(new Error(`${PACKAGE_TAG} Cannot flush disconnected persistence`))
			return Promise.resolve()
		},
		reset(options) {
			const binding = entry()?.binding
			return (
				binding?.controller?.reset?.(binding, options?.fields) ??
				Promise.reject(new Error(`${PACKAGE_TAG} Cannot reset disconnected persistence`))
			)
		},
	}
	handles.set(selector, handle)
	return handle
}

export function attachHandles(store: object, bindings: SourceBinding[]): void {
	entriesByStore.set(store, bindings)
	for (const [slot, selector] of [
		[URL_HANDLE, DEFAULT_URL],
		[PERSIST_HANDLE, DEFAULT_PERSIST],
	] as const) {
		if (!Object.prototype.hasOwnProperty.call(store, slot))
			Object.defineProperty(store, slot, {
				value: handleFor(store, selector),
				enumerable: false,
				configurable: true,
				writable: false,
			})
	}
}

function requireHandle(store: object, selector: Selector): PersistHandle {
	if (!entriesByStore.has(store)) {
		const label = selector === DEFAULT_URL ? URL_HANDLE : selector === DEFAULT_PERSIST ? PERSIST_HANDLE : selector
		throw new Error(`${PACKAGE_TAG} no "${label}" handle; ensure the store uses withPersist`)
	}
	if (typeof selector === 'string') selectEntry(store, selector)
	return handleFor(store, selector)
}

/** Wait for every persistence source attached to this store, including URL when present. */
export async function flushPersist(store: object): Promise<Record<string, PromiseSettledResult<void>>> {
	const entries = entriesByStore.get(store)
	if (!entries) throw new Error(`${PACKAGE_TAG} Store does not use withPersist`)
	const sources = entries.map(({ source }) => source)
	if (sources.includes('')) throw new Error(`${PACKAGE_TAG} Cannot flush before persistence sources are resolved`)
	const results = await Promise.all(
		sources.map(async (source): Promise<[string, PromiseSettledResult<void>]> => {
			try {
				await handleFor(store, source).flush()
				return [source, { status: 'fulfilled', value: undefined }]
			} catch (reason) {
				return [source, { status: 'rejected', reason }]
			}
		}),
	)
	return Object.fromEntries(results)
}

export function urlHandle<T extends object>(store: T, source?: string): UrlHandle<PersistState<T>> {
	return requireHandle(store, source ?? DEFAULT_URL)
}
// The runtime handle is state-erased; its source-specific reset validates every requested path.
export function persistHandle<T extends object>(store: T, source?: string): PersistHandle<PersistState<T>> {
	return requireHandle(store, source ?? DEFAULT_PERSIST) as unknown as PersistHandle<PersistState<T>>
}
