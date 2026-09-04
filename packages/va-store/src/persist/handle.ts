import { URL_SOURCE, type UrlMeta } from './url/adapter'

import type { PersistBinding } from './binding'

/** Proxy property exposing the URL control handle. */
export const URL_HANDLE = '$url'
/** Proxy property exposing the storage (persist) control handle. */
export const PERSIST_HANDLE = '$persist'

/**
 * Per-source control handle attached to a bound proxy (`$url`, `$persist`). It routes meta-tagged
 * mutations (e.g. URL push/replace) through the connected engine. When no provider is mounted (server
 * render, or before connect) it is inert: the mutation still runs, but without engine meta.
 */
export type PersistHandle = {
	/**
	 * The source this handle controls (e.g. `'url'`, `'localStorage'`), or `null` when the store
	 * declares no field for this handle's slot — the slot exists so the type is true, but there is
	 * nothing behind it and the handle stays permanently inert.
	 */
	source: string | null
	/** Run a mutation whose resulting commit carries `meta` (no-op meta when disconnected). */
	runWithMeta(meta: unknown, mutate: () => void): void
}

function createHandle(source: string | null, binding: PersistBinding | undefined): PersistHandle {
	return {
		source,
		runWithMeta(meta, mutate) {
			const controller = binding?.controller
			if (controller) {
				controller.runWithMeta(meta, mutate)
			} else {
				// Inert on the server / before connect: apply the mutation without engine meta.
				mutate()
			}
		},
	}
}

/** A binding tagged with its source — the shape the store factory tracks per proxy. */
export type SourceBinding = { source: string; binding: PersistBinding }

/** The pair of control handles every bound proxy carries — the type {@link withPersist} widens by. */
export type PersistHandles = {
	[URL_HANDLE]: UrlHandle
	[PERSIST_HANDLE]: PersistHandle
}

function defineHandle(proxy: object, name: string, source: string | null, binding: PersistBinding | undefined): void {
	if (Object.prototype.hasOwnProperty.call(proxy, name)) {
		return
	}
	Object.defineProperty(proxy, name, {
		value: createHandle(source, binding),
		enumerable: false,
		configurable: true,
		writable: false,
	})
}

/**
 * Attach BOTH control handles to a bound proxy, non-enumerably. Non-enumerable so they never leak
 * into snapshots, serialization, or a `withHistory` recorded state (whose restore would then try to
 * assign a non-writable property).
 *
 * Both slots are attached even when the store declares fields for only one of them, because
 * {@link withPersist} widens its return type by {@link PersistHandles} unconditionally — a slot the
 * runtime skipped would make that type a lie. The unbacked slot's handle carries `source: null` and
 * is inert: `runWithMeta` runs the mutation without engine meta, exactly as a bound-but-unconnected
 * handle does. A proxy bound to several storage sources exposes the first one as `$persist`.
 */
export function attachHandles(proxy: object, bindings: SourceBinding[]): void {
	const url = bindings.find(({ source }) => source === URL_SOURCE)
	const storage = bindings.find(({ source }) => source !== URL_SOURCE)
	defineHandle(proxy, URL_HANDLE, url?.source ?? null, url?.binding)
	defineHandle(proxy, PERSIST_HANDLE, storage?.source ?? null, storage?.binding)
}

/** The URL control handle, with {@link UrlMeta}-typed commit meta (`{ history: UrlHistory.Push }`). */
export type UrlHandle = Omit<PersistHandle, 'runWithMeta'> & {
	/** Run a mutation whose URL commit uses `meta` (e.g. force a `push` instead of the default `replace`). */
	runWithMeta(meta: UrlMeta, mutate: () => void): void
}

/**
 * Read a per-source control handle off a bound proxy WITHOUT casts. Handles are attached as
 * non-enumerable properties by {@link withPersist}; this resolver looks one up by name and throws a
 * named error when it is absent — which now means only that the proxy never went through
 * `withPersist` at all, since both slots are attached whatever the store declares.
 */
function requireHandle(proxy: object, name: string): PersistHandle {
	const handle = (proxy as Record<string, PersistHandle | undefined>)[name]
	if (!handle) {
		throw new Error(
			`[va-store] no "${name}" handle on this proxy. Ensure the store uses the persist() plugin with a ` +
				`${name === URL_HANDLE ? 'URL' : 'storage'} field, and resolve the handle after the store is created.`,
		)
	}
	return handle
}

/**
 * Typed accessor for the URL control handle (`$url`). Use it to drive history mode imperatively:
 * `urlHandle(store).runWithMeta({ history: UrlHistory.Push }, () => { store.step = 'profile' })`.
 * Replaces the `(store as Record<string, unknown>)[URL_HANDLE]` double-cast.
 */
export function urlHandle(proxy: object): UrlHandle {
	// The underlying `runWithMeta` accepts `unknown`, so a PersistHandle structurally satisfies the
	// narrower UrlHandle (UrlMeta) — no assertion needed.
	return requireHandle(proxy, URL_HANDLE)
}

/**
 * Typed accessor for the storage control handle (`$persist`), shared by all storage sources
 * (localStorage / sessionStorage / IndexedDB) bound to the proxy.
 */
export function persistHandle(proxy: object): PersistHandle {
	return requireHandle(proxy, PERSIST_HANDLE)
}
