import { subscribe } from 'valtio'

import { applyParamsToProxy, desiredValues, type SyncBinding } from './binding'

import type { SearchParamsHistory } from '../types'

/** Non-reactive read/write port the engine uses (supplied by the React provider). */
export type EnginePort = {
	getSnapshot(): URLSearchParams
	updateSearchParams(next: URLSearchParams, options: { history: SearchParamsHistory }): void
}

export type SyncEngine = {
	/** Hydrate the binding from the URL and start syncing it. Returns a disconnect fn. */
	connect(binding: SyncBinding): () => void
	/** Current URL params (non-reactive). Used for synchronous SSR seeding. */
	snapshot(): URLSearchParams
	/** Apply external URL params into every connected proxy (url → proxy). */
	pull(params: URLSearchParams): void
	/** Run mutations whose resulting flush uses the given history mode. */
	runWithHistory(mode: SearchParamsHistory, mutate: () => void): void
	/** Force an immediate flush (bypassing throttle). */
	flushNow(): void
	/** Disconnect everything. */
	dispose(): void
}

/** The headless sync engine: single writer, coalesced flush, equality-guarded. */
export function createSyncEngine(port: EnginePort): SyncEngine {
	const bindings = new Set<SyncBinding>()
	const unsubscribers = new Map<SyncBinding, () => void>()

	let forcedHistory: SearchParamsHistory | null = null
	let scheduled = false
	let timer: ReturnType<typeof setTimeout> | null = null

	function maxDelay(): number {
		let max = 0
		for (const binding of bindings) {
			if (binding.throttleMs > max) {
				max = binding.throttleMs
			}
		}
		return max
	}

	function defaultHistory(): SearchParamsHistory {
		for (const binding of bindings) {
			if (binding.history === 'push') {
				return 'push'
			}
		}
		return 'replace'
	}

	function flush(): void {
		const current = port.getSnapshot()
		let next = new URLSearchParams(current)
		for (const binding of bindings) {
			next = binding.layout.write(next, desiredValues(binding), binding.fields)
		}
		const history = forcedHistory ?? defaultHistory()
		forcedHistory = null
		if (next.toString() !== current.toString()) {
			port.updateSearchParams(next, { history })
		}
	}

	function scheduleFlush(): void {
		if (scheduled) {
			return
		}
		scheduled = true
		const run = (): void => {
			scheduled = false
			timer = null
			flush()
		}
		const delay = maxDelay()
		if (delay > 0) {
			timer = setTimeout(run, delay)
		} else {
			queueMicrotask(run)
		}
	}

	const api: SyncEngine = {
		connect(binding) {
			applyParamsToProxy(binding, port.getSnapshot())
			const unsubscribe = subscribe(binding.proxy, () => { scheduleFlush(); })
			binding.engine = api
			bindings.add(binding)
			unsubscribers.set(binding, unsubscribe)
			return () => {
				unsubscribe()
				binding.engine = null
				bindings.delete(binding)
				unsubscribers.delete(binding)
			}
		},

		snapshot() {
			return port.getSnapshot()
		},

		pull(params) {
			for (const binding of bindings) {
				applyParamsToProxy(binding, params)
			}
		},

		runWithHistory(mode, mutate) {
			if (mode === 'push') {
				forcedHistory = 'push'
			} else {
				forcedHistory ??= 'replace'
			}
			mutate()
		},

		flushNow() {
			if (timer) {
				clearTimeout(timer)
			}
			scheduled = false
			timer = null
			flush()
		},

		dispose() {
			for (const unsubscribe of unsubscribers.values()) {
				unsubscribe()
			}
			for (const binding of bindings) {
				binding.engine = null
			}
			unsubscribers.clear()
			bindings.clear()
		},
	}

	return api
}
