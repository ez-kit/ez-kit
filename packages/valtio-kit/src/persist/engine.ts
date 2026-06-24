import { subscribe } from 'valtio'

import { applyKeyed, ApplyMode, desiredKeyed, type PersistBinding } from './binding'

import type { CommitCtx, FieldDescriptor, Keyed, KeyedDiff, MetaMerge, SourcePort } from './types'

export type PersistEngine = {
	/** Hydrate the binding from the substrate and start syncing it. Returns a disconnect fn. */
	connect(binding: PersistBinding): () => void
	/** Current substrate snapshot (sync or async). Used for synchronous SSR seeding of new bindings. */
	snapshot(): Keyed | Promise<Keyed>
	/** Apply an external substrate change into every connected proxy (substrate → proxy). */
	pull(external: Keyed): void
	/** Run mutations whose resulting flush carries the given (merged) commit meta. */
	runWithMeta(metaPatch: unknown, mutate: () => void): void
	/** Force an immediate flush (bypassing throttle). */
	flushNow(): void
	/** Disconnect everything. */
	dispose(): void
}

export type CreateEngineOptions = {
	/** Combine the meta of mutations that coalesce into one flush. Defaults to last-wins merge. */
	mergeMeta?: MetaMerge
	/** Meta used when a flush carries no explicit per-mutation meta. */
	defaultMeta?: unknown
	/**
	 * Receives errors from an async port's `get()`/`set()` (e.g. IndexedDB rejection). Synchronous
	 * ports (URL, localStorage) never invoke this. When unset, async rejections are swallowed — async
	 * adapters are expected to handle their own I/O errors internally.
	 */
	onError?: (error: unknown) => void
}

/** A plain object (not array/Date/Map/class instance) — the only safe shape to shallow-spread. */
function isPlainObject(value: unknown): value is Record<string, unknown> {
	if (value === null || typeof value !== 'object') {
		return false
	}
	const proto = Object.getPrototypeOf(value) as object | null
	return proto === Object.prototype || proto === null
}

/** Default meta merge: shallow last-wins (`{ ...prev, ...next }`), tolerant of non-plain-object meta. */
const lastWinsMerge: MetaMerge = (prev, next) => {
	const a = isPlainObject(prev) ? prev : {}
	const b = isPlainObject(next) ? next : {}
	return { ...a, ...b }
}

/** Attach a rejection handler to an async port result so errors never float; sync results pass through. */
function settle(result: void | Promise<void>, onError?: (error: unknown) => void): void {
	if (result instanceof Promise) {
		result.catch((error: unknown) => onError?.(error))
	}
}

/** Aggregate every binding's desired output into one logical {@link Keyed} for the source. */
function aggregateDesired(bindings: Iterable<PersistBinding>): Keyed {
	const desired: Keyed = new Map()
	for (const binding of bindings) {
		for (const [key, value] of desiredKeyed(binding)) {
			desired.set(key, value)
		}
	}
	return desired
}

/** Compute which keys were added/changed and which were removed between two commits. */
function diffKeyed(prev: Keyed, next: Keyed): KeyedDiff {
	const set: string[] = []
	const removed: string[] = []
	for (const [key, value] of next) {
		if (prev.get(key) !== value) {
			set.push(key)
		}
	}
	for (const key of prev.keys()) {
		if (!next.has(key)) {
			removed.push(key)
		}
	}
	return { set, removed }
}

/**
 * The headless persist engine for a single source: one coalesced commit per flush, equality-guarded
 * against the last-committed snapshot to break the feedback loop. Substrate-agnostic — it speaks
 * only {@link Keyed} and delegates all I/O to the {@link SourcePort}.
 *
 * Note: `port.subscribe` (external-change events, e.g. cross-tab `storage`) is NOT consumed here —
 * the provider wires `subscribe → pull` so eventing stays per-source rather than per-binding.
 */
export function createPersistEngine(port: SourcePort, options: CreateEngineOptions = {}): PersistEngine {
	const mergeMeta = options.mergeMeta ?? lastWinsMerge
	const bindings = new Set<PersistBinding>()
	const unsubscribers = new Map<PersistBinding, () => void>()

	/** Last logical {@link Keyed} committed to (or pulled from) the substrate — the loop-break baseline. */
	let lastCommitted: Keyed = new Map()
	/**
	 * Per-flush-batch meta. Under throttling multiple mutations may accumulate before one flush;
	 * `mergeMeta` decides how their meta combines (e.g. URL: any push in the batch wins).
	 */
	let pendingMeta: unknown = null
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

	/** Reset the loop-break baseline to the proxies' current desired state (no commit produced). */
	function rebaseline(): void {
		lastCommitted = aggregateDesired(bindings)
	}

	function flush(): void {
		const desired = aggregateDesired(bindings)
		const diff = diffKeyed(lastCommitted, desired)
		if (diff.set.length === 0 && diff.removed.length === 0) {
			// Coalesced to a no-op: keep `pendingMeta` so its intent (e.g. push) carries to the next change.
			return
		}
		const meta = pendingMeta ?? options.defaultMeta ?? {}
		pendingMeta = null
		// `fields` is the engine-wide union of every coalesced binding's descriptors (this engine emits
		// one merged commit per source). Adapters map a `diff` key back to its field via `fieldKey`/`meta`.
		const fields: FieldDescriptor[] = []
		for (const binding of bindings) {
			fields.push(...binding.fields)
		}
		const ctx: CommitCtx = { fields, diff, meta }
		lastCommitted = desired
		settle(port.set(desired, ctx), options.onError)
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

	/** Read the substrate (sync or async) and hydrate the binding, then update the baseline. */
	function hydrate(binding: PersistBinding): void {
		const apply = (keyed: Keyed): void => {
			applyKeyed(binding, keyed, ApplyMode.Hydrate)
			rebaseline()
		}
		const initial = port.get()
		if (initial instanceof Promise) {
			initial.then(apply).catch((error: unknown) => options.onError?.(error))
		} else {
			apply(initial)
		}
	}

	const api: PersistEngine = {
		connect(binding) {
			binding.controller = api
			bindings.add(binding)
			hydrate(binding)
			const unsubscribe = subscribe(binding.proxy, () => {
				scheduleFlush()
			})
			unsubscribers.set(binding, unsubscribe)
			return () => {
				unsubscribe()
				binding.controller = null
				bindings.delete(binding)
				unsubscribers.delete(binding)
				rebaseline()
			}
		},

		snapshot() {
			return port.get()
		},

		pull(external) {
			for (const binding of bindings) {
				applyKeyed(binding, external, ApplyMode.Pull)
			}
			// Break the loop: the pulled state becomes the baseline so the scheduled flush is a no-op.
			rebaseline()
		},

		runWithMeta(metaPatch, mutate) {
			pendingMeta = mergeMeta(pendingMeta, metaPatch)
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
				binding.controller = null
			}
			unsubscribers.clear()
			bindings.clear()
			lastCommitted = new Map()
		},
	}

	return api
}
