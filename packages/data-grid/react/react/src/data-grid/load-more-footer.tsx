import { useEffect, useRef } from 'react'

import { useGridComponents } from '../components-context'
import { DATA_GRID_DEFAULTS } from '../defaults'

import { useInfiniteContext } from './infinite-context'
import { useDataGridInstance } from './table-context'
import { useInfiniteScroll } from './use-infinite-scroll'
import { useVirtualContext } from './virtual-context'

/**
 * Forward infinite-scroll footer. Emits only structural markers
 * (`data-slot="load-more-sentinel" | "load-more-row"`, `data-direction="forward"`)
 * and the injectable {@link LoadMoreRow} — no visual styling (that lives in the UI kit).
 *
 * Auto detection: in **non-virtualized** mode an IntersectionObserver watches the
 * sentinel against the scroll container. In virtualized mode detection is driven by the
 * virtualizer's last index in `VirtualBody`, so the observer here is skipped to avoid a
 * double trigger. In `manual` mode no observer runs — the injected "Load more" control
 * drives `onTrigger`.
 */
export function LoadMoreFooter() {
	const controller = useInfiniteScroll()
	const instance = useDataGridInstance()
	const gridComponents = useGridComponents()
	const { Tr, Td } = gridComponents.core
	const { LoadMoreRow } = gridComponents.infinite
	const { rowVirtualizer } = useVirtualContext()
	const { getScrollElement } = useInfiniteContext()

	const sentinelRef = useRef<HTMLTableRowElement>(null)

	const { enabled, trigger, hasMore, loadMore } = controller
	const thresholdPx = controller.threshold.px ?? DATA_GRID_DEFAULTS.infinite.threshold.px
	const isVirtualized = rowVirtualizer !== null

	useEffect(() => {
		if (!enabled || trigger !== 'auto' || isVirtualized || !hasMore) return
		// IntersectionObserver is browser-only; effects don't run on the server, but
		// guard defensively for non-DOM test/runtime environments.
		if (typeof IntersectionObserver === 'undefined') return
		const sentinel = sentinelRef.current
		const root = getScrollElement()
		if (!sentinel || !root) return

		const observer = new IntersectionObserver(
			(entries) => {
				if (entries.some((entry) => entry.isIntersecting)) {
					loadMore('forward')
				}
			},
			{ root, rootMargin: `0px 0px ${String(thresholdPx)}px 0px`, threshold: 0 },
		)
		observer.observe(sentinel)
		return () => {
			observer.disconnect()
		}
	}, [enabled, trigger, isVirtualized, hasMore, thresholdPx, getScrollElement, loadMore])

	if (!enabled) return null
	if (!hasMore && !controller.isFetching && controller.error == null) return null

	const columnCount = instance.table.getVisibleLeafColumns().length

	return (
		<>
			<tr
				ref={sentinelRef}
				data-slot='load-more-sentinel'
				data-direction='forward'
				aria-hidden='true'
			>
				<td
					colSpan={columnCount}
					aria-hidden='true'
				/>
			</tr>
			<Tr
				data-slot='load-more-row'
				data-direction='forward'
			>
				<Td colSpan={columnCount}>
					<LoadMoreRow
						columnCount={columnCount}
						direction='forward'
						isFetching={controller.isFetching}
						hasMore={controller.hasMore}
						error={controller.error}
						trigger={controller.trigger}
						onTrigger={() => {
							controller.loadMore('forward')
						}}
						onRetry={controller.retry}
					/>
				</Td>
			</Tr>
		</>
	)
}
