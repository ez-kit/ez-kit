import { attachCapability } from '@ez-kit/store-core'
import { createHistoryStack, isSameSlice } from '@ez-kit/store-core/history'
import { proxy, ref, snapshot, subscribe, unstable_enableOp } from 'valtio'
import { deepClone } from 'valtio/utils'

import { registerSliceReader } from './slice-reader'

import type { StoreEnhancer } from '@ez-kit/store-core'
import type {
	HistoryApi,
	HistoryOptions as CoreHistoryOptions,
	HistorySnapshot,
	PartializeOption,
} from '@ez-kit/store-core/history'

/**
 * One recorded Valtio operation — the meta this package's history carries, mirroring `zu-store`'s
 * `HistoryActionTag`. Spelled out here because Valtio declares the shape as `INTERNAL_Op`, and a
 * public signature cannot depend on an internal type.
 */
export type HistoryOp =
	| readonly ['set', readonly (string | symbol)[], unknown, unknown]
	| readonly ['delete', readonly (string | symbol)[], unknown]

/**
 * `@ez-kit/store-core/history`'s `HistoryOptions` bound to this package's {@link HistoryOp} meta,
 * plus `partialize` and the one Valtio-specific knob. See `zu-store`'s `HistoryOptions` for the same
 * options bound to a Zustand action tag.
 *
 * `partialize(state)` is the part of the state history tracks: steps are that slice, `undo` / `redo` /
 * `goto` assign it back onto the proxy instead of replacing the state, and a batch that leaves it
 * shallow-equal records nothing. `TSlice` is what `defaultPasts`, `defaultFutures` and `shouldRecord`
 * are typed over; it defaults to `T`, so without `partialize` the type is what it always was. Those
 * options are `NoInfer`: only `partialize` may decide the slice, or a partial seed written without it
 * would type-check and `undo` would replace the whole state with it.
 */
export type HistoryOptions<T extends object, TSlice extends object = T> = CoreHistoryOptions<
	NoInfer<TSlice>,
	readonly HistoryOp[]
> &
	PartializeOption<T, TSlice> & {
		/** Record one entry per operation instead of one per microtask batch. Defaults to `false`. */
		sync?: boolean
	}

/**
 * The public `store.history` surface, over `T` — what one step holds: the store's state, or the
 * `partialize` slice when there is one. `record` is deliberately absent: it is how the subscription
 * feeds the stack a `(prev, next)` pair it just observed, so a caller invoking it by hand would push
 * a state the store was never in. `zu-store`'s middleware keeps it internal for the same reason.
 */
export type StoreHistory<T extends object> = Omit<HistoryApi<T, readonly HistoryOp[]>, 'record'> & {
	/** Live stacks, as their own proxy — subscribe with `useSnapshot` or `useHistory`. */
	state: HistorySnapshot<T>
	toJSON: () => undefined
}

const HISTORY_KEY = 'history'
/** The one `HistoryApi` member that stays internal to the wrapper — see {@link StoreHistory}. */
const RECORD_KEY = 'record'
const HISTORY_CAPABILITY_NAME = 'history'
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
 * Builds the enhancer that wraps a Valtio proxy with an undo/redo stack on the shared
 * `@ez-kit/store-core/history` engine — apply it with {@link pipe}, or call the returned function
 * directly. Currying is what types the options: `T` is fixed by the proxy the enhancer is applied
 * to, so `shouldRecord`'s `prev`/`next` are the store's own state without an annotation.
 *
 * Nothing happens until the enhancer runs: the subscription, `attachCapability` and Valtio's
 * `unstable_enableOp` all fire on application, in the store factory, exactly where they did when
 * this took the target as its first argument.
 *
 * The applied target is mutated and returned as-is (same identity) — `history` is attached as an
 * enumerable, `ref`-wrapped field so `snapshot()` exposes the same live object instead of
 * deep-cloning it.
 *
 * The subscription always registers with Valtio's synchronous notification mode so a `skip()` (ours,
 * or the one `undo`/`redo`/`goto` wrap their own restore write in) is observed while still paused —
 * `options.sync` only controls whether *we* batch several operations into one entry ourselves, via a
 * microtask, or record each one immediately.
 */
export function withHistory<T extends object, TSlice extends object = T>(
	options: HistoryOptions<NoInfer<T>, TSlice> = {},
): StoreEnhancer<T, T & { history: StoreHistory<TSlice> }> {
	return (target: T) => {
		// Valtio only populates `subscribe`'s op payloads once this is called — off by default (the
		// `unstable_` prefix is about the shape of that payload changing across versions, not about opting
		// in being risky). Global and idempotent, and scoped to stores that actually asked for history: a
		// consumer who never calls `withHistory` never flips this process-wide flag on Valtio's behalf.
		unstable_enableOp(true)

		const { sync = false, partialize, ...historyOptions } = options
		/** The step a state maps to — the state itself (as `TSlice`, which then is `T`) without `partialize`. */
		const toSlice = (state: T): TSlice => (partialize ? partialize(state) : (state as unknown as TSlice))
		// Seed values are inert: `createHistoryStack`'s constructor calls `publish()` before returning,
		// which `Object.assign`s the real `pasts`/`futures`/`limit`/`isPaused` in below, so nothing ever
		// reads these placeholders.
		const stacks = proxy<HistorySnapshot<TSlice>>({ pasts: [], futures: [], limit: 0, isPaused: false })

		const api = createHistoryStack<TSlice, readonly HistoryOp[]>(
			{
				read: () => toSlice(omitHistoryKey(snapshot(target) as T)),
				// A whole-state step replaces the state, dropping keys it does not have; a slice is only
				// part of it, so it is assigned over the rest — replacing would delete every field outside it.
				write: (step) => {
					if (partialize) Object.assign(target, deepClone(step))
					else applyState(target, deepClone(step as unknown as T))
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
		let pendingOps: HistoryOp[] = []
		let flushScheduled = false

		function flushBatch(): void {
			flushScheduled = false
			if (pendingOps.length === 0) return

			const ops = pendingOps
			pendingOps = []
			const nextSnapshot = snapshot(target) as T
			if (nextSnapshot === lastSnapshot) return

			const prev = toSlice(omitHistoryKey(lastSnapshot))
			const next = toSlice(omitHistoryKey(nextSnapshot))
			lastSnapshot = nextSnapshot
			// A write outside the slice would push a step identical to the one before it. Valtio keeps an
			// untouched subtree at the same snapshot reference, so the shallow check sees exactly what moved.
			if (partialize && isSameSlice(prev, next)) return
			api.record(prev, next, ops)
		}

		/**
		 * Every function-valued member of `api` gets flushed-before-delegate, applied uniformly rather than
		 * as a hand-picked list of call sites. Three rounds of review each found the same failure through a
		 * different door — `undo`/`redo`/`goto` reading `adapter.read()` (the live target) as if a pending,
		 * not-yet-flushed write had already happened and then losing it to `flushBatch`'s reference-equality
		 * guard; `skip`'s transient pause reverting before a deferred flush can see it; `pause`/`clear`
		 * changing the stacks in a way a still-pending write's later flush would silently undo or duplicate.
		 * A hand-written list of wrapped call sites is exactly how a fourth method slips through unnoticed;
		 * this reads `api`'s own shape at runtime instead, so a method added to `HistoryApi` later inherits
		 * the flush automatically — an exception would require deliberately excluding a key here, not just
		 * forgetting to add one. `flushBatch()` is a no-op when nothing is pending, so this costs nothing for
		 * a member (like `resume`, see the report) that in practice never has anything to flush.
		 */
		function buildFlushingHistoryMethods(): Omit<HistoryApi<TSlice, readonly HistoryOp[]>, 'isPaused' | 'record'> {
			const methods: Record<string, unknown> = {}
			for (const [key, member] of Object.entries(api)) {
				if (typeof member !== 'function') continue
				// `record` is the subscription's own channel into the stack, not a public operation — a caller
				// handing it an arbitrary `(prev, next)` pair would push a state the store was never in.
				if (key === RECORD_KEY) continue
				methods[key] = (...args: unknown[]) => {
					flushBatch()
					return (member as (...args: unknown[]) => unknown)(...args)
				}
			}
			return methods as Omit<HistoryApi<TSlice, readonly HistoryOp[]>, 'isPaused' | 'record'>
		}

		const host = target as T & { history: StoreHistory<TSlice> }
		host.history = ref<StoreHistory<TSlice>>({
			...buildFlushingHistoryMethods(),
			get isPaused() {
				return api.isPaused
			},
			state: stacks,
			toJSON: () => undefined,
		})
		if (partialize) registerSliceReader(host.history, partialize)

		/**
		 * Attached on both server and client, ahead of the `IS_SERVER` bail-out below, so
		 * `capabilitiesOf(store)` reports the same list in either environment — the registry is a
		 * side-effect-free record of what the store is, and nothing about it is client-only. What *is*
		 * client-only lives in `setup`, which only ever runs on mount and additionally guards on
		 * `ctx.isServer`.
		 *
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

		if (IS_SERVER) return host

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
}
