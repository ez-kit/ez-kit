import { useEffect } from 'react'

import { useGridComponents } from '../components-context'
import { DATA_GRID_DEFAULTS } from '../defaults'
import { LoadMoreTrigger } from '../types'
import { resolveVirtualWindowPads } from '../utils/virtual-window-pads'

import { DataGridRow } from './row'
import { useActiveDraggingRow, usePublishRenderedRows } from './row-drag-registry'
import { useDataGridTable, useDataGridState } from './table-context'
import { useInfiniteScroll } from './use-infinite-scroll'
import { usePinnedRowOffsets } from './use-pinned-row-offsets'
import { useVirtualContext } from './virtual-context'

import type { VirtualItem } from '@tanstack/react-virtual'

/**
 * Virtualized tbody — renders only the rows currently in the viewport.
 *
 * The tbody emits `data-slot="tbody" data-virtualized="true"` and three
 * runtime-computed inline styles: a `minHeight` (the virtualizer's total size,
 * which is what reserves the scroll range) and the `paddingTop` /
 * `paddingBottom` that place the window's band inside it. The two compose
 * rather than add up because of `box-sizing: border-box`, which both kits load
 * with Tailwind's preflight. The `display: grid` / `position: relative` shape
 * comes from the structural stylesheet shipped with this package.
 *
 * A floor rather than a fixed `height`, because the loader row below can make
 * the band's content exceed the reservation, and the two are equivalent when it
 * does not: the pads are exact, so without a loader the box lands on `minHeight`
 * to the pixel. Fixed, the loader could only *overflow* the tbody — which the
 * shadcn kit happens to tolerate (the overflow reaches the scrollport's
 * scrollable range) and the heroui kit does not: its own `<table>` is
 * `overflow: clip`, so the whole loader was clipped away and unreachable, at the
 * bottom of the scroll. Measured in both kits. A floor keeps the reservation
 * without asking any kit not to clip.
 *
 * The window's rows are in flow, offset by the tbody's `paddingTop` /
 * `paddingBottom` rather than by a per-row transform — see
 * `resolveVirtualWindowPads`'s docblock for why: it is what lets the drag
 * library displace a row's neighbours. Each row still receives a runtime
 * `height` inline style, because nothing measures the rows back — a kit whose
 * natural row height differs from `estimateSize` would otherwise leave a gap
 * (or an overlap) between every pair of rows, and the explicit height keeps the
 * band aligned with the virtualizer's own arithmetic.
 *
 * Pinned rows (top / bottom) use the same data-attr + `--dg-row-pin-offset`
 * pattern as the non-virtual Body.
 *
 * Infinite scroll: detection here is virtualizer-index based (the last rendered
 * index nearing the row count), and the loader row is in flow after the band,
 * carrying the bottom pad as its own `marginTop` — see `bottomPad` below for
 * why the pad cannot stay on the container once a row follows the band.
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
	/*
	 * `isHeldOutOfWindow` rides on the entry rather than being recomputed where the rows render: the
	 * distinction is made here, once, and a second derivation at the call site could disagree with
	 * this one about which row the window still contains.
	 */
	const centerEntries =
		heldRow && heldMeasurement && !isHeldInWindow
			? [
					...windowEntries.map((entry) => ({ ...entry, isHeldOutOfWindow: false })),
					{
						index: heldIndex,
						row: heldRow,
						start: heldMeasurement.start,
						size: heldMeasurement.size,
						isHeldOutOfWindow: true,
					},
				].sort((left, right) => left.index - right.index)
			: windowEntries.map((entry) => ({ ...entry, isHeldOutOfWindow: false }))

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
	const columnCount = table.getVisibleLeafColumns().length
	/*
	 * Computed from the **window**, never from `centerEntries`: that list also carries the row being
	 * dragged once the window has scrolled past it, at its model index — so a held row near the top
	 * of a list becomes `centerEntries[0]` and its `start` of 0 silences `paddingTop` for the rest of
	 * the gesture. Measured: the band stopped being offset at all and the tbody shrank by one row's
	 * height per auto-scroll frame. That row is placed out of flow instead, and says so with
	 * `data-virtual='row-held'` — see where `centerEntries` is rendered below.
	 */
	const firstWindowItem = virtualItems[0]
	const lastWindowItem = virtualItems[virtualItems.length - 1]
	const pads = resolveVirtualWindowPads(
		firstWindowItem && lastWindowItem ? { start: firstWindowItem.start, end: lastWindowItem.end } : undefined,
		totalSize,
	)
	/*
	 * The bottom pad is reserved exactly once, by whatever is last in this tbody's flow: its own
	 * `paddingBottom` with no loader, the loader's `marginTop` with one.
	 *
	 * It cannot be both, and it cannot stay on the container when a loader follows the band, because
	 * `padding-bottom` is laid out *after* every child — so it separates the band from the tbody's
	 * bottom edge and never from a row below it. Left there, the loader renders at the window's own
	 * bottom edge: a "Load more" control floating mid-list, with the whole unscrolled remainder of the
	 * range reserved beneath it. On the margin it sits at `totalSize`, where the last row ends, which
	 * is where the old `translateY(totalSize)` put it from a padding-box origin.
	 *
	 * Nothing reserves the loader's own height, which is the point: it grows the tbody past the
	 * `minHeight` floor and so extends the scrollport's scrollable range by exactly what it needs —
	 * a two-line error message included. That is what retired `LOAD_MORE_ALLOWANCE_PX`, the fixed
	 * 56px this used to budget for it, and measuring the three states is what showed the allowance
	 * was both too small (the error state wants 68px in shadcn, 81px in heroui) and unnecessary.
	 */
	const bottomPad = `${String(pads.after)}px`

	return (
		<Tbody
			data-slot='tbody'
			data-virtualized='true'
			style={{
				minHeight: `${String(totalSize)}px`,
				paddingTop: `${String(pads.before)}px`,
				paddingBottom: showLoadMore ? '0px' : bottomPad,
			}}
		>
			{topRows.map((row, index) => (
				<DataGridRow
					key={row.id}
					row={row}
					data-pinned='top'
					ref={registerTopRow(index)}
				/>
			))}

			{/*
			 * The window's rows are in flow inside the padded band. The held row is not: it is no
			 * longer part of the band, and left in flow it re-enters it and pushes every row below it
			 * down by its own height — measured, one row's height per auto-scroll frame, which is the
			 * regression `resolveVirtualWindowPads`'s window-only arithmetic exists to prevent and
			 * which this placement completes. A `transform` is therefore legitimate here and nowhere
			 * else on this path: out of flow there is nothing but a transform that can place the row
			 * at the offset its measurement gives it, and the drag library is moving the element with
			 * a transform of its own for the duration of the gesture anyway.
			 */}
			{centerEntries.map((entry) =>
				entry.isHeldOutOfWindow ? (
					<DataGridRow
						key={entry.row.id}
						row={entry.row}
						data-virtual='row-held'
						style={{
							transform: `translateY(${String(entry.start)}px)`,
							height: `${String(entry.size)}px`,
						}}
					/>
				) : (
					<DataGridRow
						key={entry.row.id}
						row={entry.row}
						data-virtual='row'
						style={{ height: `${String(entry.size)}px` }}
					/>
				),
			)}

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
					style={{ marginTop: bottomPad }}
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
