'use client'

import { useSyncExternalStore } from 'react'

import type { AmbientAdapter, CommitCtx, Keyed, SourcePort } from '@ez-kit/valtio-kit/persist'

/**
 * A self-contained, in-memory **ambient** adapter for the live docs examples — and a complete,
 * minimal reference for writing your own `SourcePort` (see the Custom adapter page).
 *
 * The real storage adapters (`localStorageAdapter`, `sessionStorageAdapter`) read and write the
 * browser's actual storage. Inside the docs we don't want demos to pollute (or read) your real
 * `localStorage`, so each example gets its own isolated in-memory blob and renders it itself.
 *
 * Anatomy of an ambient port:
 * - `get()` reads the substrate and returns a `Keyed` (logical key → already-stringified value).
 *   Parsers run inside the engine, so the port only ever moves strings.
 * - `set(desired)` packs the `Keyed` into whatever shape the substrate wants (here, one JSON blob).
 * - `subscribe(onChange)` reports **external** changes (e.g. another tab). The writing context never
 *   notifies itself — that would echo its own writes back as a pull — so for an isolated single-tab
 *   demo it is a no-op. The provider wires `subscribe → pull`.
 */
export type MemoryStorageAdapter = {
	adapter: AmbientAdapter
	/** Reactive read of the packed JSON blob, for the example's read-out. */
	useBlob: () => string
}

const EMPTY_BLOB = ''

export function createMemoryStorageAdapter(source: string): MemoryStorageAdapter {
	let blob = EMPTY_BLOB
	// Read-out listeners are distinct from the port's external-change channel: the engine's own writes
	// update the read-out, but must NOT loop back through the port as an external pull.
	const readout = new Set<() => void>()
	const emit = (): void => {
		for (const listener of readout) {
			listener()
		}
	}

	const port: SourcePort = {
		get(): Keyed {
			const keyed: Keyed = new Map()
			if (blob !== EMPTY_BLOB) {
				const parsed = JSON.parse(blob) as Record<string, string>
				for (const [key, value] of Object.entries(parsed)) {
					keyed.set(key, value)
				}
			}
			return keyed
		},
		set(desired: Keyed, _ctx: CommitCtx): void {
			blob = desired.size === 0 ? EMPTY_BLOB : JSON.stringify(Object.fromEntries(desired))
			emit()
		},
		// No external writer in an isolated demo, so nothing ever fires. A real cross-tab adapter
		// would subscribe to a substrate event here (e.g. `window.addEventListener('storage', …)`).
		subscribe(): () => void {
			return () => undefined
		},
	}

	const adapter: AmbientAdapter = { source, port }

	const subscribeReadout = (listener: () => void): (() => void) => {
		readout.add(listener)
		return () => {
			readout.delete(listener)
		}
	}
	const useBlob = (): string =>
		useSyncExternalStore(
			subscribeReadout,
			() => blob,
			() => EMPTY_BLOB,
		)

	return { adapter, useBlob }
}

/** Shared chrome for the storage blob read-out shown under each live storage example. */
export function BlobReadout({ blob, label = 'localStorage' }: { blob: string; label?: string }) {
	return (
		<div className='mt-3 rounded-md border border-fd-border bg-fd-muted/40 px-3 py-2 font-mono text-xs'>
			<span className='text-fd-muted-foreground'>{label}&nbsp;</span>
			<span className='break-all'>{blob || <span className='text-fd-muted-foreground'>(empty)</span>}</span>
		</div>
	)
}
