import { useCallback } from 'react'

import { DATA_GRID_DEFAULTS } from '../defaults'
import { INFINITE_KEY } from '../use-data-grid'

import { useDataGridInstance, useDataGridStore } from './table-context'

import type { NormalizedInfiniteConfig } from '../use-data-grid'
import type { LoadMoreDirection } from '@ez-kit/data-grid-core'

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
	trigger: 'auto' | 'manual'
	threshold: { rows?: number; px?: number }
	/** A forward page request is in flight. */
	isFetching: boolean
	/** More rows can be loaded forward (controlled `pagination.hasNextPage`). */
	hasMore: boolean
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

function readConfig(table: { [k: symbol]: unknown }): NormalizedInfiniteConfig | undefined {
	return (table as unknown as Record<symbol, unknown>)[INFINITE_KEY] as NormalizedInfiniteConfig | undefined
}

export function useInfiniteScroll(): InfiniteController {
	const instance = useDataGridInstance()
	const table = instance.table

	const config = readConfig(table as unknown as { [k: symbol]: unknown })
	const isFetchingNextPage = useDataGridStore((s) => s.infinite.isFetchingNextPage)
	const errorState = useDataGridStore((s) => s.infinite.error)

	const loadMore = useCallback(
		(direction: LoadMoreDirection = 'forward') => {
			// Read the freshest config at call time so the latest onLoadMore closure +
			// hasNextPage value are used.
			const cfg = readConfig(table as unknown as { [k: symbol]: unknown })
			if (!cfg?.onLoadMore) return

			// Guard: nothing more to load in this direction, or a fetch is already in flight.
			const infinite = table.getSnapshot().infinite
			const canLoad =
				direction === 'forward'
					? cfg.hasNextPage && !infinite.isFetchingNextPage
					: cfg.hasPreviousPage && !infinite.isFetchingPreviousPage
			if (!canLoad) return

			const fetchingKey = direction === 'forward' ? 'isFetchingNextPage' : 'isFetchingPreviousPage'
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
		const direction = table.getSnapshot().infinite.error?.direction ?? 'forward'
		loadMore(direction)
	}, [table, loadMore])

	return {
		enabled: Boolean(config),
		trigger: config?.trigger ?? DATA_GRID_DEFAULTS.infinite.trigger,
		threshold: config?.threshold ?? { rows: DATA_GRID_DEFAULTS.infinite.threshold.rows },
		isFetching: isFetchingNextPage,
		hasMore: config?.hasNextPage ?? false,
		error: errorState?.error ?? null,
		loadMore,
		retry,
	}
}
