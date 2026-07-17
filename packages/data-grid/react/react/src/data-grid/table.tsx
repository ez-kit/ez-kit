import { useVirtualizer } from '@tanstack/react-virtual'
import { useCallback, useEffect, useRef } from 'react'

import { useGridComponents } from '../components-context'
import { INFINITE_KEY, STICKY_HEADER_KEY, VIRTUALIZED_KEY } from '../use-data-grid'
import { getColumnSizeVars, getGridTemplateColumns } from '../utils/column-size-vars'

import { Body } from './body'
import { Header } from './header'
import { InfiniteProvider } from './infinite-context'
import { PinShadowOverlay } from './pin-shadow-overlay'
import { useDataGridInstance, useDataGridStore } from './table-context'
import { VirtualProvider } from './virtual-context'

import type { NormalizedVirtualizedConfig } from '../use-data-grid'
import type { CSSProperties } from 'react'

const DEFAULT_ESTIMATE_SIZE = 50
const DEFAULT_OVERSCAN = 5

const SCROLLING_OVERFLOWS = ['auto', 'scroll']

function resolveScrollElement(wrapper: HTMLElement): HTMLElement {
	const tagged = wrapper.querySelector("[data-slot='table-scroll-container']")
	if (tagged instanceof HTMLElement) return tagged

	for (const el of wrapper.querySelectorAll('*')) {
		if (el instanceof HTMLElement) {
			const { overflowX } = getComputedStyle(el)
			if (SCROLLING_OVERFLOWS.includes(overflowX)) return el
		}
	}

	return wrapper
}

/**
 * The element that scrolls *vertically* under `scrollRoot` — i.e. the one holding
 * the bounded height, which is what infinite-scroll edge detection and
 * scroll-to-top must act on.
 *
 * Usually that is `scrollRoot` (the `table-scroll` div) itself: it owns the
 * `max-height` in sticky-header mode and no kit nests anything bounded inside it.
 * A kit may relocate the bound onto its own nested scroll container, though —
 * HeroUI does, because its `.table-root` clips horizontally and only the kit's
 * inner container can own that axis, so the vertical bound has to join it there.
 * Probe the computed overflow instead of assuming a kit: an inner container that
 * scrolls horizontally but grows freely in height (HeroUI's default, and the
 * reason this is not just `querySelector`) is NOT the vertical scroller, and
 * treating it as one reports "already at the bottom" forever.
 */
function resolveVerticalScrollElement(scrollRoot: HTMLElement): HTMLElement {
	const tagged = scrollRoot.querySelector("[data-slot='table-scroll-container']")
	if (tagged instanceof HTMLElement && SCROLLING_OVERFLOWS.includes(getComputedStyle(tagged).overflowY)) {
		return tagged
	}
	return scrollRoot
}

function updateScrollShadows(scrollEl: HTMLElement, wrapperEl: HTMLElement): void {
	const scrolledLeft = scrollEl.scrollLeft > 0
	const maxScroll = scrollEl.scrollWidth - scrollEl.clientWidth
	const scrolledRight = maxScroll > 1 && scrollEl.scrollLeft < maxScroll - 1
	wrapperEl.style.setProperty('--dg-pin-left-shadow', scrolledLeft ? '1' : '0')
	wrapperEl.style.setProperty('--dg-pin-right-shadow', scrolledRight ? '1' : '0')
}

function useScrollShadows(
	wrapperRef: { current: HTMLElement | null },
	scrollRef?: { current: HTMLElement | null },
): void {
	useEffect(() => {
		const wrapper = wrapperRef.current
		if (!wrapper) return
		const scrollEl = scrollRef?.current ?? resolveScrollElement(wrapper)
		const update = () => {
			updateScrollShadows(scrollEl, wrapper)
		}
		scrollEl.addEventListener('scroll', update, { passive: true })
		update()
		const ro = new ResizeObserver(update)
		ro.observe(scrollEl)
		return () => {
			scrollEl.removeEventListener('scroll', update)
			ro.disconnect()
		}
	}, [wrapperRef, scrollRef])
}

/**
 * Publishes the rendered thead height as `--dg-header-height` on the wrapper so
 * pinned-top rows can be offset below the sticky header (consumed by the
 * structural stylesheet). No-op when sticky header is disabled.
 */
function useHeaderHeightVar(wrapperRef: { current: HTMLElement | null }, enabled: boolean): void {
	useEffect(() => {
		if (!enabled) return
		const wrapper = wrapperRef.current
		if (!wrapper) return
		const thead = wrapper.querySelector("[data-slot='thead']")
		if (!(thead instanceof HTMLElement)) return

		const update = () => {
			wrapper.style.setProperty('--dg-header-height', `${String(thead.offsetHeight)}px`)
		}
		update()
		const ro = new ResizeObserver(update)
		ro.observe(thead)
		return () => {
			ro.disconnect()
			wrapper.style.removeProperty('--dg-header-height')
		}
	}, [wrapperRef, enabled])
}

function resolveEstimateSize(
	estimateSize: NormalizedVirtualizedConfig['row']['estimateSize'],
): (index: number) => number {
	if (typeof estimateSize === 'function') return estimateSize
	const size = estimateSize ?? DEFAULT_ESTIMATE_SIZE
	return () => size
}

/**
 * Renders the full `<table>` with header and body.
 *
 * All layout, overflow, and positioning rules are emitted as `data-*` attributes
 * and consumed by the structural stylesheet shipped with this package
 * (`@ez-kit/data-grid-react/styles.css`). The only inline styles set here are
 * CSS custom properties (column widths, grid-template-columns).
 *
 * Pin shadows: a single absolutely-positioned overlay div sits outside the
 * scroll container. CSS vars `--dg-pin-left-shadow` / `--dg-pin-right-shadow`
 * on the wrapper drive their opacity.
 */
export function DataGridTable() {
	const { Table } = useGridComponents().core
	const instance = useDataGridInstance()
	const table = instance.table

	// Narrow subscriptions: re-render only when slices that actually affect
	// the table layout or row composition change. Editing / rowSelection /
	// per-row state changes do NOT touch any of these.
	useDataGridStore((s) => s.columnSizing)
	useDataGridStore((s) => s.columnSizingInfo)
	useDataGridStore((s) => s.columnVisibility)
	useDataGridStore((s) => s.columnPinning)
	// Row-model affecting slices (used when virtualized to size the virtualizer).
	const sorting = useDataGridStore((s) => s.sorting)
	const columnFilters = useDataGridStore((s) => s.columnFilters)
	const globalFilter = useDataGridStore<unknown>((s) => s.globalFilter)
	const pagination = useDataGridStore((s) => s.pagination)
	useDataGridStore((s) => s.expanded)
	useDataGridStore((s) => s.rowPinning)

	const sizeVars = getColumnSizeVars(table)
	const gridTemplateColumns = getGridTemplateColumns(table)

	const virtualizedConfig = (table as unknown as Record<symbol, unknown>)[VIRTUALIZED_KEY] as
		| NormalizedVirtualizedConfig
		| undefined

	const isVirtualized = Boolean(virtualizedConfig)
	const isStickyHeader = Boolean((table as unknown as Record<symbol, unknown>)[STICKY_HEADER_KEY])

	// wrapperRef — outer div; CSS pin-shadow vars are written here so the overlay reads them
	const wrapperRef = useRef<HTMLDivElement>(null)
	// containerRef — inner scroll div used by useVirtualizer (virtualized mode only)
	const containerRef = useRef<HTMLDivElement>(null)
	// scrollRef — the `data-slot="table-scroll"` div (non-virtualized mode); see getScrollElement
	const scrollRef = useRef<HTMLDivElement>(null)

	const rows = isVirtualized ? (table.options.enableRowPinning ? table.getCenterRows() : table.getRowModel().rows) : []

	// eslint-disable-next-line react-hooks/incompatible-library
	const rowVirtualizer = useVirtualizer({
		count: isVirtualized ? rows.length : 0,
		getScrollElement: () => containerRef.current,
		estimateSize: resolveEstimateSize(virtualizedConfig?.row.estimateSize),
		overscan: virtualizedConfig?.row.overscan ?? DEFAULT_OVERSCAN,
		enabled: isVirtualized,
	})

	// Virtualized: containerRef IS the scroll element; pass it directly to skip DOM traversal.
	// Non-virtualized: resolveScrollElement finds the real scroll element inside wrapperRef
	// (handles both shadcn's inner overflow div and HeroUI's inner ScrollContainer).
	useScrollShadows(wrapperRef, isVirtualized ? containerRef : undefined)
	useHeaderHeightVar(wrapperRef, isStickyHeader)

	// Re-evaluate shadow state immediately when column layout changes (pin/unpin, resize)
	// so shadows update without requiring a scroll event.
	useEffect(() => {
		const wrapper = wrapperRef.current
		if (!wrapper) return
		const scrollEl = isVirtualized ? containerRef.current : resolveScrollElement(wrapper)
		if (!scrollEl) return
		updateScrollShadows(scrollEl, wrapper)
		// wrapperRef and containerRef are stable refs; isVirtualized never changes after mount
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [gridTemplateColumns])

	// ── infinite scroll ───────────────────────────────────────────────────────
	// Shared scroll element for edge detection and reset-to-top: the element that scrolls
	// *vertically*. Deliberately NOT resolveScrollElement — that finds the first *horizontal*
	// scroller for the pin shadows, which is a different element whenever a kit nests its own
	// horizontally-scrolling container. See resolveVerticalScrollElement.
	const getScrollElement = useCallback((): HTMLElement | null => {
		if (isVirtualized) return containerRef.current
		const scrollRoot = scrollRef.current
		return scrollRoot ? resolveVerticalScrollElement(scrollRoot) : null
		// isVirtualized never changes after mount; refs are stable.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [])

	const infiniteEnabled = Boolean((table as unknown as Record<symbol, unknown>)[INFINITE_KEY])

	// Reset on query change: when sorting / column filters / global search / page size
	// change in infinite mode, clear any error, re-arm detection (handled by the loader
	// re-mounting at the top) and scroll back to top so the observer doesn't immediately
	// refire at the stale bottom. The consumer drops accumulated rows in its own onChange.
	const querySignature = JSON.stringify([sorting, columnFilters, globalFilter, pagination.pageSize])
	const prevQuerySignature = useRef<string | null>(null)
	useEffect(() => {
		if (!infiniteEnabled) return
		if (prevQuerySignature.current === null) {
			prevQuerySignature.current = querySignature
			return
		}
		if (prevQuerySignature.current === querySignature) return
		prevQuerySignature.current = querySignature
		table.setInfiniteStatus({ error: null })
		const scrollEl = getScrollElement()
		if (scrollEl) scrollEl.scrollTop = 0
	}, [querySignature, infiniteEnabled, getScrollElement, table])

	const tableEl = (
		<Table
			data-slot='table'
			{...(isVirtualized ? { 'data-virtualized': 'true' } : {})}
			style={
				{
					...sizeVars,
					'--grid-template-columns': gridTemplateColumns,
				} as CSSProperties
			}
		>
			<Header stickyHeader={isStickyHeader} />
			<Body />
		</Table>
	)

	if (isVirtualized) {
		return (
			<InfiniteProvider getScrollElement={getScrollElement}>
				<VirtualProvider rowVirtualizer={rowVirtualizer}>
					<div
						ref={wrapperRef}
						data-slot='table-wrapper'
						data-virtualized='true'
					>
						<div
							ref={containerRef}
							data-slot='table-scroll'
							data-virtualized='true'
						>
							{tableEl}
						</div>
						<PinShadowOverlay />
					</div>
				</VirtualProvider>
			</InfiniteProvider>
		)
	}

	return (
		<InfiniteProvider getScrollElement={getScrollElement}>
			<div
				ref={wrapperRef}
				data-slot='table-wrapper'
			>
				<div
					ref={scrollRef}
					data-slot='table-scroll'
					{...(isStickyHeader ? { 'data-sticky-header': 'true' } : {})}
				>
					{tableEl}
				</div>
				<PinShadowOverlay />
			</div>
		</InfiniteProvider>
	)
}
