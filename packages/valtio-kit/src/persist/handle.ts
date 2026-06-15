import { URL_SOURCE } from './url/adapter'

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
