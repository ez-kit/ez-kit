import { LoadMoreDirection } from '@ez-kit/data-grid-core'
import { useCallback } from 'react'

import { DATA_GRID_DEFAULTS } from '../defaults'

import { useDataGridTable, useDataGridState } from './table-context'

import type { ResolvedGridOptions } from '../resolved-options'
import type { LoadMoreTrigger } from '../types'
import type { NormalizedInfiniteConfig } from '../use-data-grid'

/**
 * Infinite-scroll controller shared by the detection sites (sentinel observer,
 * virtualizer index) and the loader UI.
 *
 * Ownership split: `hasNextPage` is a user-owned pagination option read reactively from
 * the config (INFINITE_KEY); `isFetching` / `error` are grid-owned state read from the
 * store. The duplicate / no-next-page guard lives here (not in core), since core state
 * no longer knows `hasNextPage`.
 */
export type InfiniteController = {
	/** Infinite mode is active. */
	enabled: boolean
	trigger: LoadMoreTrigger
	threshold: { rows?: number; px?: number }
	/** A forward page request is in flight. */
	isFetching: boolean
	/** More rows can be loaded forward (controlled `pagination.hasNextPage`). */
	hasNextPage: boolean
	/** Last forward error (unwrapped), or null. */
	error: unknown
	/**
	 * Run a load in `direction` (default `'forward'`). Guards against duplicate /
	 * no-next-page requests, brackets the `onLoadMore` promise with `setInfiniteStatus`,
	 * and records errors.
	 */
	loadMore: (direction?: LoadMoreDirection) => void
	/** Re-run the failed load and clear the error. */
	retry: () => void
}

/**
 * Read at call time, never captured: the hook must use the freshest `onLoadMore` closure and
 * `hasNextPage` value, both of which `useDataGrid` reassigns on every render.
 */
function readConfig(table: { grid: ResolvedGridOptions }): NormalizedInfiniteConfig | undefined {
	return table.grid.pagination.infinite
}

export function useInfiniteScroll(): InfiniteController {
	const table = useDataGridTable()

	// `table` is a legitimate dependency for the two callbacks below because `useDataGrid` returns
	// one stable object per table. That is load-bearing rather than incidental: `loadMore` is the
	// dependency of the sentinel effect in `load-more-footer.tsx` and of the index-based one in
	// `virtual-body.tsx`, and **both call it** when the threshold is met — so an identity that
	// moved per render would turn "load when the last row nears the end" into "re-check on every
	// render of the grid", and would re-attach a scroll listener and a `ResizeObserver` each time.
	const config = readConfig(table)
	// `<LoadMoreFooter />` mounts unconditionally inside `<Tbody>`, and `VirtualBody` reaches this
	// hook by a second route, so these two run on **every** grid — including one that configures
	// no infinite scroll at all. Optional-chained so `infiniteFeature` is not required to render
	// a plain table. See `feature-optionality.test.tsx`.
	// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- runtime-optional feature slice; see the FEATURE GUARDS note in types.ts
	const isFetchingNextPage = useDataGridState((s) => s.infinite?.isFetchingNextPage ?? false)
	// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- runtime-optional feature slice; see the FEATURE GUARDS note in types.ts
	const errorState = useDataGridState((s) => s.infinite?.error ?? null)

	const loadMore = useCallback(
		(direction: LoadMoreDirection = 'forward') => {
			// Read the freshest config at call time so the latest onLoadMore closure +
			// hasNextPage value are used.
			const cfg = readConfig(table)
			if (!cfg?.onLoadMore) return

			// Guard: nothing more to load in this direction, or a fetch is already in flight.
			const infinite = table.store.state.infinite
			const canLoad =
				direction === LoadMoreDirection.Forward
					? cfg.hasNextPage && !infinite.isFetchingNextPage
					: cfg.hasPreviousPage && !infinite.isFetchingPreviousPage
			if (!canLoad) return

			const fetchingKey = direction === LoadMoreDirection.Forward ? 'isFetchingNextPage' : 'isFetchingPreviousPage'
			table.setInfiniteStatus({ [fetchingKey]: true, error: null })

			// Invoke synchronously so callers (observer / button) trigger the fetch
			// immediately; only the settle/error handling is deferred to the promise.
			let result: Promise<void> | void
			try {
				result = cfg.onLoadMore({ direction })
			} catch (err: unknown) {
				table.setInfiniteStatus({ [fetchingKey]: false, error: { direction, error: err } })
				return
			}
			Promise.resolve(result)
				.then(() => {
					table.setInfiniteStatus({ [fetchingKey]: false })
				})
				.catch((err: unknown) => {
					table.setInfiniteStatus({ [fetchingKey]: false, error: { direction, error: err } })
				})
		},
		[table],
	)

	const retry = useCallback(() => {
		// Read the failed direction imperatively so retry doesn't depend on the
		// error snapshot closure (which loadMore clears as soon as it runs).
		const direction = table.store.state.infinite.error?.direction ?? LoadMoreDirection.Forward
		loadMore(direction)
	}, [table, loadMore])

	return {
		enabled: Boolean(config),
		trigger: config?.trigger ?? DATA_GRID_DEFAULTS.pagination.trigger,
		threshold: config?.threshold ?? { rows: DATA_GRID_DEFAULTS.pagination.threshold.rows },
		isFetching: isFetchingNextPage,
		hasNextPage: config?.hasNextPage ?? false,
		error: errorState?.error ?? null,
		loadMore,
		retry,
	}
}
