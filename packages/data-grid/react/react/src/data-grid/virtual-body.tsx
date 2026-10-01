import { useEffect } from 'react'

import { useGridComponents } from '../components-context'
import { DATA_GRID_DEFAULTS } from '../defaults'
import { LoadMoreTrigger } from '../types'

import { DataGridRow } from './row'
import { useActiveDraggingRow, usePublishRenderedRows } from './row-drag-registry'
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
 * a `data-virtual="row"` for the structural CSS that sets
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
	// Re-renders this body when a row drag starts or ends, which is what lets it keep the dragged row
	// mounted after the window has scrolled past it.
	const activeRowId = useActiveDraggingRow()

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

	const { enabled, trigger, hasNextPage, isFetching, loadMore } = controller
	const thresholdRows = controller.threshold.rows ?? DATA_GRID_DEFAULTS.pagination.threshold.rows
	const rowCount = centerRows.length

	// Index-based detection: load when the last rendered row nears the end.
	// Skip while a fetch is in flight so we don't re-invoke the guarded no-op on
	// every scroll frame; the effect re-runs once `isFetching` clears.
	useEffect(() => {
		if (!enabled || trigger !== LoadMoreTrigger.Auto || !hasNextPage || isFetching) return
		if (lastIndex < 0) return
		if (lastIndex >= rowCount - thresholdRows) {
			loadMore('forward')
		}
	}, [enabled, trigger, hasNextPage, isFetching, lastIndex, rowCount, thresholdRows, loadMore])

	/*
	 * The centre rows this body renders, in index order: the virtualizer's window, plus the row being
	 * dragged once the window has scrolled past it.
	 *
	 * Holding that row is the whole of why a virtualized grid can be reordered by drag at all. Let it
	 * unmount and its sortable unregisters mid-gesture, which puts a hole in an index space the
	 * library requires to be exactly `0..n-1` — and the failure is invisible, because from then on the
	 * element under the pointer is dnd-kit's clone rather than React's row, so the drag looks alive
	 * while the drop resolves the source to `-1`. Measured; see the plan's Task 1 gate.
	 *
	 * OUT_OF_WINDOW_ROW: the pinned bands below already render outside the virtualizer's range, so
	 * this reuses that rather than reaching for a `rangeExtractor`.
	 */
	const windowEntries = virtualItems.flatMap((virtualRow: VirtualItem) => {
		const row = centerRows[virtualRow.index]
		return row ? [{ index: virtualRow.index, row, start: virtualRow.start, size: virtualRow.size }] : []
	})
	const heldIndex = activeRowId === null ? -1 : centerRows.findIndex((row) => row.id === activeRowId)
	const heldRow = heldIndex < 0 ? undefined : centerRows[heldIndex]
	// Indexed by row index and built for every row from `estimateSize`, so this is present whenever
	// the row is. Without it the row would have to render at an offset it does not occupy, which for
	// an upward drag means a ghost row above the window — so a missing measurement holds nothing and
	// lets `row.tsx`'s development error report the hole instead of hiding it behind a wrong position.
	const heldMeasurement = heldIndex < 0 ? undefined : rowVirtualizer?.measurementsCache[heldIndex]
	// One id, one registration: a row that is both in the window and held must render exactly once.
	const isHeldInWindow = windowEntries.some((entry) => entry.index === heldIndex)
	const centerEntries =
		heldRow && heldMeasurement && !isHeldInWindow
			? [
					...windowEntries,
					{ index: heldIndex, row: heldRow, start: heldMeasurement.start, size: heldMeasurement.size },
				].sort((left, right) => left.index - right.index)
			: windowEntries

	/*
	 * What this body renders, in DOM order, for the two readers that need to agree on it: a row
	 * computing its own drag index, and the provider resolving where a drop landed. The held row is in
	 * it by construction — it is built as "window plus the held row" rather than appended — so the
	 * space keeps its density the moment the row leaves the window.
	 */
	usePublishRenderedRows(
		rowVirtualizer
			? [
					...topRows.map((row) => row.id),
					...centerEntries.map((entry) => entry.row.id),
					...bottomRows.map((row) => row.id),
				]
			: null,
	)

	if (!rowVirtualizer) return null

	const totalSize = rowVirtualizer.getTotalSize()
	const showLoadMore = enabled && (hasNextPage || controller.isFetching || controller.error != null)
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

			{centerEntries.map((entry) => (
				<DataGridRow
					key={entry.row.id}
					row={entry.row}
					data-virtual='row'
					style={{ transform: `translateY(${String(entry.start)}px)`, height: `${String(entry.size)}px` }}
				/>
			))}

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
					<Td
						data-slot='td'
						colSpan={columnCount}
					>
						<LoadMoreRow
							columnCount={columnCount}
							direction='forward'
							isFetching={controller.isFetching}
							hasNextPage={controller.hasNextPage}
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
