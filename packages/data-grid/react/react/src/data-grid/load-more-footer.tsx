import { useEffect, useRef } from 'react'

import { useGridComponents } from '../components-context'
import { DATA_GRID_DEFAULTS } from '../defaults'
import { LoadMoreTrigger } from '../types'

import { useInfiniteContext } from './infinite-context'
import { useDataGridTable } from './table-context'
import { useInfiniteScroll } from './use-infinite-scroll'
import { useVirtualContext } from './virtual-context'

/**
 * Forward infinite-scroll footer. Emits only structural markers
 * (`data-slot="load-more-row"`, `data-direction="forward"`) and the injectable
 * {@link LoadMoreRow} — no visual styling (that lives in the UI kit).
 *
 * Auto detection: in **non-virtualized** mode the scroll container is watched directly and a
 * load fires once its bottom edge comes within `threshold.px`. In virtualized mode detection
 * is driven by the virtualizer's last index in `VirtualBody`, so this listener is skipped to
 * avoid a double trigger. In `manual` mode nothing is watched — the injected "Load more"
 * control drives `onTrigger`.
 *
 * Detection deliberately measures the scroll container rather than observing a sentinel
 * element rendered into the table: a UI kit may render `Tbody` as a collection (HeroUI's
 * `Table.Body` is a React Aria collection) which builds its rows in one pass and renders the
 * real DOM in a later commit. A ref pointing into that content resolves to a collection node
 * — or to nothing at all — so a sentinel-based observer either threw or silently never
 * armed. The scroll container is owned by this package, so measuring it works in every kit.
 */
export function LoadMoreFooter() {
	const controller = useInfiniteScroll()
	const table = useDataGridTable()
	const gridComponents = useGridComponents()
	const { Tr, Td } = gridComponents.core
	const { LoadMoreRow } = gridComponents.infinite
	const { rowVirtualizer } = useVirtualContext()
	const { getScrollElement } = useInfiniteContext()

	const { enabled, trigger, hasMore, isFetching, loadMore } = controller
	const thresholdPx = controller.threshold.px ?? DATA_GRID_DEFAULTS.pagination.threshold.px
	const isVirtualized = rowVirtualizer !== null

	// Whether the last measurement was already inside the trigger zone. Held in a ref so it
	// survives re-arming (e.g. when `hasMore` changes) — a fresh `false` would re-fire a load
	// for a bottom edge the user never crossed again.
	const wasWithinThresholdRef = useRef(false)

	useEffect(() => {
		if (!enabled || trigger !== LoadMoreTrigger.Auto || isVirtualized || !hasMore) return
		const root = getScrollElement()
		if (!root) return

		// Edge-triggered, mirroring the IntersectionObserver this replaced: a load fires when
		// the bottom edge is *entered*, not for as long as it stays in view. Level-triggering
		// would drain every page at once whenever the content cannot overflow.
		const check = () => {
			// Nothing to scroll — the content fits, or the container has no laid-out height yet.
			// There is no bottom edge for the user to reach, so firing here would load pages with
			// no interaction at all; a kit that commits its rows in a later pass (HeroUI's
			// collection body) measures as an empty container on this first pass.
			if (root.scrollHeight <= root.clientHeight) {
				wasWithinThresholdRef.current = false
				return
			}
			const distanceToBottom = root.scrollHeight - root.scrollTop - root.clientHeight
			const isWithinThreshold = distanceToBottom <= thresholdPx
			if (isWithinThreshold && !wasWithinThresholdRef.current) loadMore('forward')
			wasWithinThresholdRef.current = isWithinThreshold
		}

		root.addEventListener('scroll', check, { passive: true })
		// A container that grows/shrinks can cross the threshold without a scroll event.
		const resizeObserver = new ResizeObserver(check)
		resizeObserver.observe(root)
		// Runs on mount and, via the `isFetching` dependency, again once each load settles:
		// appended rows push the bottom edge away without emitting a scroll event, so this is
		// what clears the "already in the zone" latch and re-arms the next entry.
		check()

		return () => {
			root.removeEventListener('scroll', check)
			resizeObserver.disconnect()
		}
	}, [enabled, trigger, isVirtualized, hasMore, isFetching, thresholdPx, getScrollElement, loadMore])

	if (!enabled) return null
	if (!hasMore && !isFetching && controller.error == null) return null

	const columnCount = table.getVisibleLeafColumns().length

	return (
		<Tr
			data-slot='load-more-row'
			data-direction='forward'
		>
			<Td colSpan={columnCount}>
				<LoadMoreRow
					columnCount={columnCount}
					direction='forward'
					isFetching={isFetching}
					hasMore={hasMore}
					error={controller.error}
					trigger={trigger}
					onTrigger={() => {
						loadMore('forward')
					}}
					onRetry={controller.retry}
				/>
			</Td>
		</Tr>
	)
}
