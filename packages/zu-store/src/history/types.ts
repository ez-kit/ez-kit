import type { HistoryApi, HistoryOptions as CoreHistoryOptions, HistorySnapshot } from '@ez-kit/store-core/history'

/**
 * Optional tag for a single write, carried through the third positional
 * argument of `set(partial, replace, action)` — the same convention used
 * by Zustand's `devtools` middleware. Passed through to {@link HistoryOptions.shouldRecord}
 * so consumers can filter history entries by action kind.
 */
export type HistoryActionTag = string | { type: string }

/**
 * `@ez-kit/store-core/history`'s `HistoryOptions` bound to zu-store's `HistoryActionTag` meta.
 *
 * - `limit` — maximum number of past states to keep. Defaults to 100.
 * - `defaultPaused` — start history recording paused. Defaults to false.
 * - `defaultPasts` / `defaultFutures` — pre-populate the stacks. Entries exceeding `limit` are
 *   trimmed from the front.
 * - `shouldRecord(prev, next, action)` — predicate run before recording a write. Return `false`
 *   to skip the history entry — the store state still updates, only the recording is suppressed.
 * - `partialize(state)` — the part of the state history tracks. Steps are that slice, `undo` /
 *   `redo` / `goto` merge it back with `set(slice)` instead of replacing the state, and a write that
 *   leaves it shallow-equal records nothing. Omitted, the slice is the whole state.
 *
 * `TSlice` is what every stack-facing option is typed over: `defaultPasts`, `defaultFutures` and
 * `shouldRecord` take slices, not the full state. It defaults to `T`, so without `partialize` the
 * type is what it always was. Those options are `NoInfer`: only `partialize` may decide the slice,
 * or a partial seed written without it would type-check and `undo` would replace the whole state
 * with it. It is an object because restoring merges it back key by key.
 */
export type HistoryOptions<T, TSlice = T> = CoreHistoryOptions<NoInfer<TSlice>, HistoryActionTag> & {
	/** Returns `TSlice & object` rather than constraining `TSlice`, so the default stays exactly `T`. */
	partialize?: (state: T) => TSlice & object
}

/**
 * The shape of `store.history`'s state: the live stacks plus the undo/redo/goto controls, bound
 * to zu-store's `HistoryActionTag` meta. `record` stays internal to the middleware — it is not
 * part of the public sub-store. `HistorySnapshot`'s fields are `readonly` at the source
 * (`@ez-kit/store-core/history`), so no extra `Readonly<...>` wrap is needed here.
 *
 * `T` is what one step holds: the store's state, or the `partialize` slice when there is one.
 */
export type StoreHistory<T> = HistorySnapshot<T> & Omit<HistoryApi<T, HistoryActionTag>, 'isPaused' | 'record'>
