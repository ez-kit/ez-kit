import { useEffect } from 'react'

import { useGridComponents } from '../components-context'
import { DATA_GRID_DEFAULTS } from '../defaults'
import { LoadMoreTrigger } from '../types'

import { DataGridRow } from './row'
import { useDataGridTable, useDataGridState } from './table-context'
import { useInfiniteScroll } from './use-infinite-scroll'
import { usePinnedRowOffsets } from './use-pinned-row-offsets'
import { useVirtualContext } from './virtual-context'

import type { VirtualItem } from '@tanstack/react-virtual'

/**
 * Vertical space reserved below the virtual rows for the load-more loader (px).
 * Fixed allowance: kits must keep their `LoadMoreRow` within this height in
 * virtualized mode, or a tall/wrapping loader (e.g. a long error message) can
 * overflow the reserved area. Generous enough for the shipped shadcn/heroui kits.
 */
const LOAD_MORE_ALLOWANCE_PX = 56

/**
 * Virtualized tbody — renders only the rows currently in the viewport.
 *
 * The tbody emits `data-slot="tbody" data-virtualized="true"` and a single
 * runtime-computed `height` inline style (the virtualizer's total size). The
 * `display: grid` / `position: relative` shape comes from the structural
 * stylesheet shipped with this package.
 *
 * Each virtual row receives runtime `transform: translateY(start)` and `height`
 * inline styles — values come from the virtualizer and cannot move to CSS — plus
 * a `data-slot="virtual-row"` for the structural CSS that sets
 * `position: absolute; left: 0; top: 0; width: 100%`. The explicit height makes
 * the row fill exactly the slot the virtualizer reserved for it: nothing measures
 * the rows back, so a kit whose natural row height differs from `estimateSize`
 * would otherwise leave a gap (or an overlap) between every pair of rows.
 *
 * Pinned rows (top / bottom) use the same data-attr + `--dg-row-pin-offset`
 * pattern as the non-virtual Body.
 *
 * Infinite scroll: detection here is virtualizer-index based (the last rendered
 * index nearing the row count), and the loader row is absolutely positioned just
 * below the spacer with extra height reserved.
 */
export function VirtualBody() {
	const table = useDataGridTable()
	const gridComponents = useGridComponents()
	const { Tbody, Tr, Td } = gridComponents.core
	const { LoadMoreRow } = gridComponents.infinite
	const { rowVirtualizer } = useVirtualContext()
	const controller = useInfiniteScroll()
	// Subscribe to infinite slice so the loader row re-renders on status change.
	useDataGridState((s) => s.infinite)

	const virtualItems = rowVirtualizer?.getVirtualItems() ?? []
	const lastIndex = virtualItems.length > 0 ? (virtualItems[virtualItems.length - 1]?.index ?? -1) : -1

	const hasPinning = Boolean(table.options.enableRowPinning)
	const topRows = hasPinning ? table.getTopRows() : []
	const centerRows = hasPinning ? table.getCenterRows() : table.getRowModel().rows
	const bottomRows = hasPinning ? table.getBottomRows() : []
	const registerTopRow = usePinnedRowOffsets(
		'top',
		topRows.map((row) => row.id),
	)
	const registerBottomRow = usePinnedRowOffsets(
		'bottom',
		bottomRows.map((row) => row.id),
	)

	const { enabled, trigger, hasMore, isFetching, loadMore } = controller
	const thresholdRows = controller.threshold.rows ?? DATA_GRID_DEFAULTS.pagination.threshold.rows
	const rowCount = centerRows.length

	// Index-based detection: load when the last rendered row nears the end.
	// Skip while a fetch is in flight so we don't re-invoke the guarded no-op on
	// every scroll frame; the effect re-runs once `isFetching` clears.
	useEffect(() => {
		if (!enabled || trigger !== LoadMoreTrigger.Auto || !hasMore || isFetching) return
		if (lastIndex < 0) return
		if (lastIndex >= rowCount - thresholdRows) {
			loadMore('forward')
		}
	}, [enabled, trigger, hasMore, isFetching, lastIndex, rowCount, thresholdRows, loadMore])

	if (!rowVirtualizer) return null

	const totalSize = rowVirtualizer.getTotalSize()
	const showLoadMore = enabled && (hasMore || controller.isFetching || controller.error != null)
	const tbodyHeight = totalSize + (showLoadMore ? LOAD_MORE_ALLOWANCE_PX : 0)
	const columnCount = table.getVisibleLeafColumns().length

	return (
		<Tbody
			data-slot='tbody'
			data-virtualized='true'
			style={{ height: `${String(tbodyHeight)}px` }}
		>
			{topRows.map((row, index) => (
				<DataGridRow
					key={row.id}
					row={row}
					data-pinned='top'
					ref={registerTopRow(index)}
				/>
			))}

			{virtualItems.map((virtualRow: VirtualItem) => {
				const row = centerRows[virtualRow.index]
				if (!row) return null
				return (
					<DataGridRow
						key={row.id}
						row={row}
						data-virtual='row'
						style={{ transform: `translateY(${String(virtualRow.start)}px)`, height: `${String(virtualRow.size)}px` }}
					/>
				)
			})}

			{bottomRows.map((row, index) => (
				<DataGridRow
					key={row.id}
					row={row}
					data-pinned='bottom'
					ref={registerBottomRow(index)}
				/>
			))}

			{showLoadMore && (
				<Tr
					data-slot='load-more-row'
					data-direction='forward'
					data-virtual='load-more'
					style={{ transform: `translateY(${String(totalSize)}px)` }}
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
			)}
		</Tbody>
	)
}
