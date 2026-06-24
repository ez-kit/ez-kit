import { URL_SOURCE, type UrlMeta } from './url/adapter'

import type { PersistBinding } from './binding'

/** Proxy property exposing the URL control handle. */
export const URL_HANDLE = '$url'
/** Proxy property exposing the storage (persist) control handle. */
export const PERSIST_HANDLE = '$persist'

/** Map a source id to the proxy property that exposes its control handle. */
function handleNameFor(source: string): string {
	return source === URL_SOURCE ? URL_HANDLE : PERSIST_HANDLE
}

/**
 * Per-source control handle attached to a bound proxy (`$url`, `$persist`). It routes meta-tagged
 * mutations (e.g. URL push/replace) through the connected engine. When no provider is mounted (server
 * render, or before connect) it is inert: the mutation still runs, but without engine meta.
 */
export type PersistHandle = {
	/** The source this handle controls (e.g. `'url'`, `'localStorage'`). */
	source: string
	/** Run a mutation whose resulting commit carries `meta` (no-op meta when disconnected). */
	runWithMeta(meta: unknown, mutate: () => void): void
}

function createHandle(source: string, binding: PersistBinding): PersistHandle {
	return {
		source,
		runWithMeta(meta, mutate) {
			const controller = binding.controller
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

/**
 * Attach a non-enumerable control handle per source to a bound proxy. Non-enumerable so it never
 * leaks into snapshots or serialization. A proxy bound to several sources exposes one handle each
 * (`$url` and `$persist`) without collision.
 */
export function attachHandles(proxy: object, bindings: SourceBinding[]): void {
	for (const { source, binding } of bindings) {
		const name = handleNameFor(source)
		if (Object.prototype.hasOwnProperty.call(proxy, name)) {
			continue
		}
		Object.defineProperty(proxy, name, {
			value: createHandle(source, binding),
			enumerable: false,
			configurable: true,
			writable: false,
		})
	}
}

/** The URL control handle, with {@link UrlMeta}-typed commit meta (`{ history: UrlHistory.Push }`). */
export type UrlHandle = Omit<PersistHandle, 'runWithMeta'> & {
	/** Run a mutation whose URL commit uses `meta` (e.g. force a `push` instead of the default `replace`). */
	runWithMeta(meta: UrlMeta, mutate: () => void): void
}

/**
 * Read a per-source control handle off a bound proxy WITHOUT casts. The handle is attached as a
 * non-enumerable property by the {@link persist} plugin's `setup`; this resolver looks it up by the
 * source's handle name and throws a named error when it is absent (no persist plugin, no field for
 * that source, or called before the store's Provider mounted).
 */
function requireHandle(proxy: object, name: string): PersistHandle {
	const handle = (proxy as Record<string, PersistHandle | undefined>)[name]
	if (!handle) {
		throw new Error(
			`[valtio-kit] no "${name}" handle on this proxy. Ensure the store uses the persist() plugin with a ` +
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
