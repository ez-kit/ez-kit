import { attachCapability } from '@ez-kit/store-core'
import { createHistoryStack } from '@ez-kit/store-core/history'
import { proxy, ref, snapshot, subscribe, unstable_enableOp } from 'valtio'
import { deepClone } from 'valtio/utils'

import type { HistoryApi, HistoryOptions, HistorySnapshot } from '@ez-kit/store-core/history'

/** Valtio declares this shape as `INTERNAL_Op`; a public signature cannot depend on an internal type. */
export type ValtioOp =
	| readonly ['set', readonly (string | symbol)[], unknown, unknown]
	| readonly ['delete', readonly (string | symbol)[], unknown]

export type ValtioHistoryOptions<T extends object> = HistoryOptions<T, readonly ValtioOp[]> & {
	/** Record one entry per operation instead of one per microtask batch. Defaults to `false`. */
	sync?: boolean
}

export type StoreHistory<T extends object> = HistoryApi<T, readonly ValtioOp[]> & {
	/** Live stacks, as their own proxy — subscribe with `useSnapshot` or `useHistory`. */
	state: HistorySnapshot<T>
	toJSON: () => undefined
}

const HISTORY_KEY = 'history'
const HISTORY_CAPABILITY_NAME = 'History'
const IS_SERVER = typeof window === 'undefined'

/** The key `withHistory` hangs its own API off; never part of a recorded past/future state. */
function omitHistoryKey<T extends object>(state: T): T {
	const record = state as Record<string, unknown>
	if (!(HISTORY_KEY in record)) return state

	const { [HISTORY_KEY]: _history, ...rest } = record
	return rest as T
}

/** Assigns `state`'s keys onto `target` and deletes target keys absent from `state`. Never touches `history`. */
function applyState<T extends object>(target: T, state: T): void {
	const record = target as Record<string, unknown>
	const next = state as Record<string, unknown>

	for (const key of Object.keys(record)) {
		if (key !== HISTORY_KEY && !(key in next)) Reflect.deleteProperty(record, key)
	}
	Object.assign(record, next)
}

/**
 * Wraps a Valtio proxy with an undo/redo stack on the shared `@ez-kit/store-core/history` engine.
 * `target` is mutated and returned as-is (same identity) — `history` is attached as an enumerable,
 * `ref`-wrapped field so `snapshot()` exposes the same live object instead of deep-cloning it.
 *
 * The subscription always registers with Valtio's synchronous notification mode so a `skip()` (ours,
 * or the one `undo`/`redo`/`goto` wrap their own restore write in) is observed while still paused —
 * `options.sync` only controls whether *we* batch several operations into one entry ourselves, via a
 * microtask, or record each one immediately.
 */
export function withHistory<T extends object>(
	target: T,
	options: ValtioHistoryOptions<T> = {},
): T & { history: StoreHistory<T> } {
	// Valtio only populates `subscribe`'s op payloads once this is called — off by default (the
	// `unstable_` prefix is about the shape of that payload changing across versions, not about opting
	// in being risky). Global and idempotent, and scoped to stores that actually asked for history: a
	// consumer who never calls `withHistory` never flips this process-wide flag on Valtio's behalf.
	unstable_enableOp(true)

	const { sync = false, ...historyOptions } = options
	// Seed values are inert: `createHistoryStack`'s constructor calls `publish()` before returning,
	// which `Object.assign`s the real `pasts`/`futures`/`limit`/`isPaused` in below, so nothing ever
	// reads these placeholders.
	const stacks = proxy<HistorySnapshot<T>>({ pasts: [], futures: [], limit: 0, isPaused: false })

	const api = createHistoryStack<T, readonly ValtioOp[]>(
		{
			read: () => omitHistoryKey(snapshot(target) as T),
			write: (state) => {
				applyState(target, deepClone(state))
			},
			onStateChange: (next) => Object.assign(stacks, next),
		},
		historyOptions,
	)

	// Tracked as the *raw* snapshot (history key included) rather than the stripped one: Valtio caches
	// and reuses that reference until the next real mutation, which is what makes the `===` checks below
	// a cheap "did anything actually change since we last looked" test. `omitHistoryKey` always allocates
	// a fresh object (the key is always present), so comparing its output would never be reference-equal.
	let lastSnapshot = snapshot(target) as T
	let pendingOps: ValtioOp[] = []
	let flushScheduled = false

	function flushBatch(): void {
		flushScheduled = false
		if (pendingOps.length === 0) return

		const ops = pendingOps
		pendingOps = []
		const nextSnapshot = snapshot(target) as T
		if (nextSnapshot === lastSnapshot) return

		api.record(omitHistoryKey(lastSnapshot), omitHistoryKey(nextSnapshot), ops)
		lastSnapshot = nextSnapshot
	}

	const host = target as T & { history: StoreHistory<T> }
	host.history = ref<StoreHistory<T>>({
		// `undo`/`redo`/`goto` all read `adapter.read()` (the *live* target) to capture "the current
		// state" before moving it into the other stack. A write still sitting in `pendingOps` — made
		// this same tick, not yet flushed — would otherwise be read as if it had already happened, and
		// then silently dropped by `flushBatch`'s `nextSnapshot === lastSnapshot` guard once it does run
		// (nothing changed between the flush and `lastSnapshot` any more, from its point of view). Flush
		// first so the pending write becomes its own recorded step before the jump reads "current".
		record: (prev, next, meta) => {
			flushBatch()
			api.record(prev, next, meta)
		},
		undo: () => {
			flushBatch()
			api.undo()
		},
		redo: () => {
			flushBatch()
			api.redo()
		},
		goto: (index) => {
			flushBatch()
			api.goto(index)
		},
		// `skip`'s pause is transient — `fn` runs, then `isPaused` reverts synchronously, before a
		// pending (not yet flushed) earlier write's deferred notification can ever observe it. Without
		// flushing first, that earlier write is read as already applied by nothing in particular (no
		// `read()` call happens here), then silently dropped by `flushBatch`'s reference-equality guard
		// once the deferred flush finally runs and finds the state unchanged since the reset caused by
		// `fn`'s own (correctly suppressed) write. Flushing first turns it into its own recorded step.
		skip: (fn) => {
			flushBatch()
			api.skip(fn)
		},
		clear: api.clear,
		pause: api.pause,
		resume: api.resume,
		get isPaused() {
			return api.isPaused
		},
		state: stacks,
		toJSON: () => undefined,
	})

	if (IS_SERVER) return host

	/**
	 * `createContextStore`'s Provider applies the seed value and any controlled `value` push
	 * synchronously, in the same batch the factory runs in — before this capability's `setup` runs on
	 * mount. Re-baselining here (decision 9) makes the state the user first saw the start of history
	 * instead of a phantom "before `value` was applied" step; `flushBatch`'s reference check then
	 * drops that already-pending batch once it fires, since nothing changed since the reset.
	 */
	attachCapability(target, {
		name: HISTORY_CAPABILITY_NAME,
		setup(_instance, ctx) {
			if (!ctx.isServer) lastSnapshot = snapshot(target) as T
			return undefined
		},
	})

	subscribe(
		target,
		(ops) => {
			if (ops.length === 0) return

			// A paused write (ours, from undo/redo/goto's restore, or the caller's own `skip`) is
			// observed synchronously here, while still paused — keep `lastSnapshot` correct without
			// recording.
			if (api.isPaused) {
				lastSnapshot = snapshot(target) as T
				return
			}

			// `notifyInSync: true` means Valtio hands us one op per call today, but nothing about that
			// is part of its contract — spread the whole array rather than assuming a length of 1.
			pendingOps.push(...ops)
			if (sync) {
				flushBatch()
				return
			}
			if (!flushScheduled) {
				flushScheduled = true
				queueMicrotask(flushBatch)
			}
		},
		true,
	)

	return host
}
