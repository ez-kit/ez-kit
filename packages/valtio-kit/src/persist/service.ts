import { serviceKey } from '@ez-kit/store-core'

import type { PersistEngine } from './engine'
import type { ServiceKey } from '@ez-kit/store-core'

/** Stable id under which `PersistProvider` publishes the per-source engine map as a store-core service. */
export const PERSIST_ENGINES_ID = 'valtio-kit.persist.engines'

/**
 * App-level lookup of the one engine mounted per source by a {@link PersistProvider}. The `persist()`
 * plugin resolves this from `ctx.services` and connects its bindings to `get(source)`. `get` throws a
 * named error for an unmounted source; `safeGet` returns `undefined` (used by the instance-outlives-engine
 * guard so a missing engine degrades to a no-op rather than crashing a re-bind).
 */
export type PersistEngines = {
	/** Engine for `source`, or throw a named error when no adapter for that source is mounted. */
	get(source: string): PersistEngine
	/** Engine for `source`, or `undefined` when none is mounted. */
	safeGet(source: string): PersistEngine | undefined
	/** The sources that currently have a mounted engine, in adapter order. */
	sources(): readonly string[]
}

/** Service key carrying {@link PersistEngines}. Published by `PersistProvider`, resolved by `persist()`. */
export const PERSIST_ENGINES: ServiceKey<PersistEngines> = serviceKey<PersistEngines>(PERSIST_ENGINES_ID)

/** Error thrown by {@link PersistEngines.get} when a source has no mounted engine. */
export function engineNotMountedError(source: string): Error {
	return new Error(`[valtio-kit] persist: no engine mounted for source "${source}"`)
}

/** Build a {@link PersistEngines} view over a source → engine map (one writer per source). */
export function createPersistEngines(engines: ReadonlyMap<string, PersistEngine>): PersistEngines {
	return {
		get(source) {
			const engine = engines.get(source)
			if (!engine) throw engineNotMountedError(source)
			return engine
		},
		safeGet(source) {
			return engines.get(source)
		},
		sources() {
			return [...engines.keys()]
		},
	}
}
