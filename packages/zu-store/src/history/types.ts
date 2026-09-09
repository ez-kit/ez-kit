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
 */
export type HistoryOptions<T> = CoreHistoryOptions<T, HistoryActionTag>

/**
 * The shape of `store.history`'s state: the live stacks plus the undo/redo/goto controls, bound
 * to zu-store's `HistoryActionTag` meta. `record` stays internal to the middleware — it is not
 * part of the public sub-store. `HistorySnapshot`'s fields are `readonly` at the source
 * (`@ez-kit/store-core/history`), so no extra `Readonly<...>` wrap is needed here.
 */
export type HistoryState<T> = HistorySnapshot<T> & Omit<HistoryApi<T, HistoryActionTag>, 'isPaused' | 'record'>
